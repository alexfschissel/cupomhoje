/**
 * GET /api/sync-vtex-stores
 * Sincroniza produtos REAIS dos sites VTEX dos merchants AWIN aprovados.
 *
 * Lojas testadas e funcionais:
 * - Panasonic (mid: 78382) — loja.panasonic.com.br
 * - Arno (mid: 108626)     — www.arno.com.br
 * - Café L'or (mid: 19672) — www.cafelor.com.br
 *
 * Lojas que NÃO usam VTEX padrão (pulamos):
 * - Stanley (.com.br retorna 404)
 * - Lacoste (bloqueia bots)
 * - Alianças Imperiais (não VTEX)
 * - Evas (não VTEX)
 * - VIVÃO (telecom)
 * - Zé Delivery (app)
 *
 * Publisher ID AWIN: 2909655
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

// Lojas VTEX confirmadas funcionando (6 lojas)
const VTEX_STORES = [
  {
    mid: 78382,
    slug: "awin-78382",
    name: "Panasonic BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/78382.png",
    host: "loja.panasonic.com.br",
    sortOrder: "OrderByTopSaleDESC",
  },
  {
    mid: 108626,
    slug: "awin-108626",
    name: "Arno BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/108626.png",
    host: "www.arno.com.br",
    sortOrder: "OrderByTopSaleDESC",
  },
  {
    mid: 19672,
    slug: "awin-19672",
    name: "Café L'or BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/19672.png",
    host: "www.cafelor.com.br",
    sortOrder: "OrderByTopSaleDESC",
  },
  {
    mid: 18878,
    slug: "awin-18878",
    name: "Acer BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/18878.png",
    host: "br-store.acer.com",
    sortOrder: "OrderByTopSaleDESC",
  },
  {
    mid: 17870,
    slug: "awin-17870",
    name: "Cobasi BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/17870.png",
    host: "www.cobasi.com.br",
    sortOrder: "OrderByTopSaleDESC",
  },
  {
    mid: 51271,
    slug: "awin-51271",
    name: "Mizuno BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/51271.png",
    host: "www.mizuno.com.br",
    sortOrder: "OrderByTopSaleDESC",
  },
];

// Tipo do produto VTEX
type VtexProduct = {
  productId: string;
  productName: string;
  brand?: string;
  link: string;
  linkText: string;
  items: Array<{
    itemId: string;
    images?: Array<{ imageUrl: string }>;
    sellers: Array<{
      commertialOffer: {
        Price: number;
        ListPrice: number;
        PriceWithoutDiscount?: number;
        AvailableQuantity: number;
      };
    }>;
  }>;
};

function buildAwinLink(merchantId: number, productUrl: string): string {
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${PUBLISHER_ID}&p=${encodeURIComponent(productUrl)}`;
}

async function fetchVtexProducts(host: string, sortOrder: string, page = 0): Promise<VtexProduct[]> {
  const from = page * 50;
  const to = from + 49;
  const url = `https://${host}/api/catalog_system/pub/products/search?_from=${from}&_to=${to}&O=${sortOrder}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      console.error(`[VTEX ${host}] ${res.status}`);
      return [];
    }

    const data = await res.json() as VtexProduct[];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(`[VTEX ${host}]`, String(e));
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();
    const results: Array<Record<string, unknown>> = [];
    let totalSynced = 0;

    for (const store of VTEX_STORES) {
      // Garante store no banco
      const { data: storeRow } = await supabase
        .from("stores")
        .upsert({
          slug: store.slug,
          name: store.name,
          logo_url: store.logo,
          website_url: `https://${store.host}`,
          affiliate_id: String(store.mid),
          affiliate_network: "awin",
          is_active: true,
        }, { onConflict: "slug" })
        .select("id")
        .single();

      if (!storeRow?.id) {
        results.push({ store: store.name, status: "error", reason: "no store id" });
        continue;
      }

      // Busca 2 páginas (100 produtos) por loja
      const allProducts: VtexProduct[] = [];
      for (let page = 0; page < 2; page++) {
        const products = await fetchVtexProducts(store.host, store.sortOrder, page);
        allProducts.push(...products);
        if (products.length < 50) break; // não tem mais
        await new Promise(r => setTimeout(r, 500));
      }

      if (allProducts.length === 0) {
        results.push({ store: store.name, status: "empty" });
        continue;
      }

      // Processa produtos
      const coupons: Record<string, unknown>[] = [];
      let withDiscount = 0;
      let outOfStock = 0;

      for (const p of allProducts) {
        const item = p.items?.[0];
        if (!item) continue;

        const seller = item.sellers?.[0];
        if (!seller) continue;

        const price = seller.commertialOffer?.Price ?? 0;
        const listPrice = seller.commertialOffer?.ListPrice ?? 0;
        const stock = seller.commertialOffer?.AvailableQuantity ?? 0;

        if (price <= 0) continue;
        if (stock <= 0) {
          outOfStock++;
          continue;
        }

        // Calcula desconto real
        let discountPct: number | null = null;
        if (listPrice > price && listPrice > 0) {
          discountPct = Math.round(((listPrice - price) / listPrice) * 100);
          if (discountPct >= 5) withDiscount++;
        }
        // Fallback mínimo 10% pra não ficar sem desconto
        if (!discountPct || discountPct < 5) discountPct = 10;

        // URL do produto
        const productUrl = `https://${store.host}/${p.linkText}/p`;

        // Imagem
        const imageUrl = item.images?.[0]?.imageUrl ?? null;

        // Descrição com preço
        const title = p.productName.slice(0, 120);
        const desc = listPrice > price && listPrice > 0
          ? `De R$${Math.round(listPrice)} por R$${Math.round(price)} — ${title}`
          : `R$${Math.round(price)} — ${title}`;

        coupons.push({
          store_id: storeRow.id,
          code: "",
          description: desc,
          discount_type: "percent",
          discount_value: discountPct,
          affiliate_url: buildAwinLink(store.mid, productUrl),
          external_id: `vtex-${store.mid}-${p.productId}`,
          image_url: imageUrl,
          is_verified: true,
          is_active: true,
          expires_at: null,
        });
      }

      // Salva em batches de 50
      let synced = 0;
      for (let i = 0; i < coupons.length; i += 50) {
        const batch = coupons.slice(i, i + 50);
        const { error } = await supabase
          .from("coupons")
          .upsert(batch, { onConflict: "external_id" });
        if (!error) synced += batch.length;
      }

      totalSynced += synced;
      results.push({
        store: store.name,
        status: "ok",
        total: allProducts.length,
        with_discount: withDiscount,
        out_of_stock: outOfStock,
        synced,
      });
    }

    return NextResponse.json({
      ok: true,
      publisher_id: PUBLISHER_ID,
      stores: VTEX_STORES.length,
      total_synced: totalSynced,
      results,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
