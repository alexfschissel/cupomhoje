/**
 * GET /api/sync-mercadolivre-api
 * Busca produtos do Mercado Livre com desconto via API pública
 * Gera links de afiliado com seu tracking ID
 *
 * Tracking ID: 96MBNZ-LQA4 (ou outro fornecido)
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

// Seu ID de afiliado do Mercado Livre
const ML_TRACKING_ID = process.env.MERCADOLIVRE_TRACKING_ID ?? "96MBNZ-LQA4";

/**
 * Monta link de afiliado do Mercado Livre
 * Exemplo: https://www.mercadolivre.com.br/item/123?c_id=96MBNZ-LQA4
 */
function buildAffiliateLink(itemId: string): string {
  return `https://www.mercadolivre.com.br/item/${itemId}?c_id=${ML_TRACKING_ID}`;
}

/**
 * Busca produtos com desconto via API pública do ML
 * Queries de exemplo: "ofertas", "desconto", "promoção"
 */
async function searchMLProducts(query: string): Promise<Record<string, unknown>[]> {
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&sort=price_asc&limit=50`;
    console.log(`[ML] Buscando: ${url}`);

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!res.ok) {
      console.error(`[ML] ${res.status}: ${await res.text().then(t => t.substring(0, 200))}`);
      return [];
    }

    const json = await res.json() as Record<string, unknown>;
    const results = (json["results"] as Record<string, unknown>[]) ?? [];
    console.log(`[ML] "${query}": encontrados ${results.length} produtos`);

    // Miniaturas: aceita mesmo sem desconto (nichada)
    return results.filter(item => {
      const price = (item["price"] as number) ?? 0;
      return price > 0;
    });
  } catch (e) {
    console.error(`[ML Search] Erro em "${query}":`, String(e));
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    console.log("[ML Sync] Iniciando busca de produtos com desconto...");

    const supabase = db();

    // Garante que a store Mercado Livre existe
    const { data: store } = await supabase
      .from("stores")
      .upsert({
        slug: "mercadolivre",
        name: "Mercado Livre",
        website_url: "https://www.mercadolivre.com.br",
        affiliate_network: "mercadolivre",
        is_active: true
      }, { onConflict: "slug" })
      .select("id")
      .single();

    if (!store?.id) {
      return NextResponse.json({ error: "Falha ao criar store Mercado Livre" }, { status: 500 });
    }

    // NICHO: Miniaturas colecionáveis (Junho/2026)
    const queries = [
      "hot wheels",
      "hot wheels premium",
      "mini gt",
      "mini gt lb works",
      "kaido house",
      "matchbox",
      "matchbox premium",
    ];

    let totalProducts = 0;
    let totalSynced = 0;

    for (const query of queries) {
      const products = await searchMLProducts(query);
      console.log(`[ML] "${query}": ${products.length} produtos encontrados`);

      const coupons: Record<string, unknown>[] = [];

      for (const item of products.slice(0, 10)) {
        // Max 10 por query para não sobrecarregar
        const itemId = item["id"] as string;
        const title = (item["title"] as string)?.slice(0, 120) ?? "";
        const price = item["price"] as number;
        const original = item["original_price"] as number;
        const image = item["thumbnail"] as string;

        if (!itemId || !title || !price) continue;

        totalProducts++;

        const discount = original > price
          ? Math.round(((original - price) / original) * 100)
          : null;

        const desc = original > 0 && price > 0
          ? `De R$${Math.round(original)} por R$${Math.round(price)} — ${title}`
          : `R$${Math.round(price)} — ${title}`;

        const affiliateUrl = buildAffiliateLink(itemId);

        coupons.push({
          store_id:       store.id,
          code:           "",
          description:    desc,
          discount_type:  discount ? "percent" : "other",
          discount_value: discount,
          affiliate_url:  affiliateUrl,
          external_id:    `ml-${itemId}`,
          image_url:      image,
          is_verified:    true,
          is_active:      true,
          expires_at:     null,
        });
      }

      if (coupons.length > 0) {
        const { error } = await supabase
          .from("coupons")
          .upsert(coupons, { onConflict: "external_id" });

        if (!error) {
          totalSynced += coupons.length;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      total_found: totalProducts,
      total_synced: totalSynced,
      tracking_id: ML_TRACKING_ID,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    console.error("[ML Sync Error]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
