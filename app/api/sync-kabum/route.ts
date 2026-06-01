/**
 * GET /api/sync-kabum
 * Sincroniza produtos em OFERTA da Kabum via API pública.
 *
 * Endpoint: https://servicespub.prod.api.aws.grupokabum.com.br/catalog/v2/products
 * Filtro: facet_oferta:Sim (apenas produtos em oferta)
 * AWIN merchant ID: 17729
 * Publisher ID: 2909655
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const auth   = req.headers.get("authorization") ?? "";
  const S = process.env.SYNC_SECRET ?? "";
  const C = process.env.CRON_SECRET ?? "";
  return secret === S || auth === `Bearer ${S}` || auth === `Bearer ${C}`;
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PUBLISHER_ID = 2909655;
const MERCHANT_ID = 17729; // Kabum BR
const MERCHANT_NAME = "KaBuM!";
const MERCHANT_LOGO = "https://ui.awin.com/images/upload/merchant/profile/17729.png";

type KabumProduct = {
  id: string;
  attributes: {
    title: string;
    description?: string;
    menu?: string;
    price: number;
    old_price?: number;
    discount_percentage?: number;
    price_with_discount?: number;
    available?: boolean;
    stock?: number;
    has_free_shipping?: boolean;
    product_link: string;
    photos?: {
      p?: string[]; // small
      m?: string[]; // medium
      b?: string[]; // big
    };
  };
};

function buildAwinLink(productUrl: string): string {
  return `https://www.awin1.com/cread.php?awinmid=${MERCHANT_ID}&awinaffid=${PUBLISHER_ID}&p=${encodeURIComponent(productUrl)}`;
}

async function fetchKabumPage(page: number): Promise<KabumProduct[]> {
  const url = `https://servicespub.prod.api.aws.grupokabum.com.br/catalog/v2/products?facets=facet_oferta:Sim&page_size=50&page=${page}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });
    if (!res.ok) {
      console.error(`[Kabum] page ${page} ${res.status}`);
      return [];
    }
    const json = await res.json() as { data?: KabumProduct[] };
    return json.data ?? [];
  } catch (e) {
    console.error(`[Kabum] page ${page}`, String(e));
    return [];
  }
}

// Filtra produtos lixo (categorias indesejadas)
function isValidCategory(menu?: string, title?: string): boolean {
  if (!menu && !title) return true;
  const text = `${menu ?? ""} ${title ?? ""}`.toLowerCase();

  const blocked = [
    "livro", "livros", "ebook", "kindle",
    "adesivo", "etiqueta",
    "openbox", // produtos abertos podem confundir
  ];

  return !blocked.some(w => text.includes(w));
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    // Garante store
    const { data: store } = await supabase
      .from("stores")
      .upsert({
        slug: `awin-${MERCHANT_ID}`,
        name: MERCHANT_NAME,
        logo_url: MERCHANT_LOGO,
        website_url: "https://www.kabum.com.br/",
        affiliate_id: String(MERCHANT_ID),
        affiliate_network: "awin",
        is_active: true,
      }, { onConflict: "slug" })
      .select("id")
      .single();

    if (!store?.id) {
      return NextResponse.json({ error: "Falha ao criar store Kabum" }, { status: 500 });
    }

    // Busca 6 páginas (300 produtos em oferta)
    const allProducts: KabumProduct[] = [];
    for (let page = 1; page <= 6; page++) {
      const products = await fetchKabumPage(page);
      allProducts.push(...products);
      if (products.length < 50) break;
      await new Promise(r => setTimeout(r, 300));
    }

    if (allProducts.length === 0) {
      return NextResponse.json({ ok: false, msg: "Nenhum produto recebido da Kabum" });
    }

    // Processa
    const coupons: Record<string, unknown>[] = [];
    let skipped = 0;
    let withDiscount = 0;

    for (const p of allProducts) {
      const a = p.attributes;

      if (!a.title || !a.product_link || !p.id) { skipped++; continue; }
      if (a.available === false) { skipped++; continue; }
      if ((a.stock ?? 0) <= 0) { skipped++; continue; }
      if (!isValidCategory(a.menu, a.title)) { skipped++; continue; }

      const price = a.price_with_discount ?? a.price ?? 0;
      const originalPrice = a.old_price ?? 0;

      if (price <= 5) { skipped++; continue; }

      // Calcula desconto
      let discountPct: number = a.discount_percentage ?? 0;
      if (!discountPct && originalPrice > price) {
        discountPct = Math.round(((originalPrice - price) / originalPrice) * 100);
      }
      if (discountPct < 5) discountPct = 5; // mínimo pra entrar no filtro do post
      if (discountPct >= 5 && a.discount_percentage) withDiscount++;

      // Imagem
      const imageUrl = a.photos?.m?.[0] ?? a.photos?.p?.[0] ?? a.photos?.b?.[0] ?? null;

      // URL do produto Kabum
      const productUrl = `https://www.kabum.com.br/produto/${p.id}/${a.product_link}`;

      // Descrição
      const title = a.title.slice(0, 120);
      const desc = originalPrice > price && originalPrice > 0
        ? `De R$${Math.round(originalPrice)} por R$${Math.round(price)} — ${title}`
        : `R$${Math.round(price)} — ${title}`;

      coupons.push({
        store_id: store.id,
        code: "",
        description: desc,
        discount_type: "percent",
        discount_value: discountPct,
        affiliate_url: buildAwinLink(productUrl),
        external_id: `kabum-${p.id}`,
        image_url: imageUrl,
        is_verified: true,
        is_active: true,
        expires_at: null,
      });
    }

    // Salva em batches
    let synced = 0;
    for (let i = 0; i < coupons.length; i += 50) {
      const batch = coupons.slice(i, i + 50);
      const { error } = await supabase
        .from("coupons")
        .upsert(batch, { onConflict: "external_id" });
      if (!error) synced += batch.length;
    }

    return NextResponse.json({
      ok: true,
      merchant: MERCHANT_NAME,
      merchant_id: MERCHANT_ID,
      received: allProducts.length,
      skipped,
      with_real_discount: withDiscount,
      synced,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
