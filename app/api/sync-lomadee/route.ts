/**
 * GET /api/sync-lomadee
 * Sincroniza produtos do Lomadee via API v2 (new endpoint)
 *
 * Endpoint: https://api-beta.lomadee.com.br/affiliate/products
 * Header: x-api-key: LOMADEE_API_TOKEN
 *
 * ⚠️ IMPORTANTE: Você precisa atualizar LOMADEE_API_TOKEN com sua chave da nova API
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

// Chave API v2 do Lomadee (novo endpoint beta)
// Aceita LOMADEE_APP_TOKEN (nome no Vercel) ou LOMADEE_API_TOKEN (alternativo)
const LOMADEE_API_TOKEN = process.env.LOMADEE_APP_TOKEN ?? process.env.LOMADEE_API_TOKEN ?? "";

async function fetchLomaDeeCoupons(): Promise<Record<string, unknown>[]> {
  try {
    if (!LOMADEE_API_TOKEN) {
      console.error("[Lomadee] LOMADEE_API_TOKEN não configurado!");
      return [];
    }

    // Novo endpoint: API v2 Beta — busca 100 produtos por vez
    const url = "https://api-beta.lomadee.com.br/affiliate/products?limit=100&page=1";

    console.log("[Lomadee] Buscando produtos via API v2...");
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "x-api-key": LOMADEE_API_TOKEN,
        "User-Agent": "CupomHoje/1.0"
      }
    });

    if (!res.ok) {
      console.error(`[Lomadee] ${res.status}: ${await res.text().then(t => t.substring(0, 200))}`);
      return [];
    }

    const json = await res.json() as Record<string, unknown>;
    const products = (json["data"] as Record<string, unknown>[]) ?? [];

    console.log(`[Lomadee] Encontrados ${products.length} produtos`);
    return products;

  } catch (e) {
    console.error("[Lomadee] Erro:", String(e));
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();
    const coupons = await fetchLomaDeeCoupons();

    if (coupons.length === 0) {
      return NextResponse.json({
        ok: false,
        msg: "Nenhum cupom encontrado",
        ts: new Date().toISOString(),
      });
    }

    let synced = 0;
    const stores = new Set<string>();

    for (const product of coupons) {
      // Estrutura do produto conforme API v2 Lomadee
      const productId = (product["id"] as string) ?? "";
      const name = (product["name"] as string)?.slice(0, 120) ?? "";
      const productUrl = (product["url"] as string) ?? "";
      const organizationId = (product["organizationId"] as string) ?? "";

      // Tenta extrair primeira imagem
      const images = (product["images"] as { url?: string }[]) ?? [];
      const imageUrl = images.length > 0 ? images[0].url : null;

      // Tenta extrair preço da primeira opção/variante
      // ⚠️ Lomadee API v2 retorna preços já em REAIS (não centavos)
      let priceOriginal = 0;
      let priceCurrent = 0;
      const options = (product["options"] as Record<string, unknown>[]) ?? [];
      if (options.length > 0) {
        const opt = options[0];
        const pricing = (opt["pricing"] as { listPrice?: number; price?: number }[]) ?? [];
        if (pricing.length > 0) {
          priceOriginal = pricing[0].listPrice ?? 0;
          priceCurrent = pricing[0].price ?? 0;
        }
      }

      // Verifica disponibilidade
      const available = product["available"] as boolean;
      if (available === false) continue;

      if (!productId || !name || !productUrl) continue;

      // Calcula desconto se houver
      let discountPct: number | null = null;
      if (priceOriginal > 0 && priceCurrent > 0 && priceOriginal > priceCurrent) {
        discountPct = Math.round(((priceOriginal - priceCurrent) / priceOriginal) * 100);
      }

      // Nome da loja (tenta extrair do organizationId ou usa padrão)
      const storeName = "Lomadee Partners";

      const { data: s } = await supabase
        .from("stores")
        .upsert({
          slug: `lomadee-${organizationId.slice(0, 8).toLowerCase()}`,
          name: storeName,
          website_url: "https://www.lomadee.com.br",
          affiliate_network: "lomadee",
          is_active: true
        }, { onConflict: "slug" })
        .select("id")
        .single();

      if (!s?.id) continue;
      stores.add(storeName);

      // Monta descrição com preço
      const desc = priceOriginal > 0 && priceCurrent > 0 && priceOriginal > priceCurrent
        ? `De R$${Math.round(priceOriginal)} por R$${Math.round(priceCurrent)} — ${name}`
        : priceCurrent > 0
        ? `R$${Math.round(priceCurrent)} — ${name}`
        : name;

      const { error } = await supabase.from("coupons").upsert({
        store_id: s.id,
        code: "",
        description: desc,
        discount_type: discountPct ? "percent" : "other",
        discount_value: discountPct,
        affiliate_url: productUrl,
        external_id: `lomadee-${productId}`,
        image_url: imageUrl,
        is_verified: true,
        is_active: true,
        expires_at: null,
      }, { onConflict: "external_id" });

      if (!error) synced++;
    }

    return NextResponse.json({
      ok: true,
      total: coupons.length,
      synced,
      stores: stores.size,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
