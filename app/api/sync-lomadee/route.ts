/**
 * GET /api/sync-lomadee
 * Sincroniza produtos do Lomadee (afiliados brasileiros)
 * API: https://docs.lomadee.com.br/api-reference/introduction
 *
 * API Key: fFmWad3OVvCgFi3um7YZfjQ6u1sQ4ImI
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

const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY ?? "fFmWad3OVvCgFi3um7YZfjQ6u1sQ4ImI";
const LOMADEE_SOURCE_ID = process.env.LOMADEE_SOURCE_ID ?? "cupomhoje";

/**
 * Busca cupons/produtos do Lomadee via API
 * Base: https://beta.lomadee.com.br
 * API Key: fFmWad3OVvCgFi3um7YZfjQ6u1sQ4ImI
 */
async function fetchLomadeeProducts(page: number = 1): Promise<Record<string, unknown>[]> {
  try {
    console.log(`[Lomadee] Buscando página ${page}...`);

    // Tenta endpoint da API beta
    const endpoints = [
      `https://beta.lomadee.com.br/api/v1/products?apiKey=${LOMADEE_API_KEY}&page=${page}&limit=100`,
      `https://api-beta.lomadee.com.br/v1/products?apiKey=${LOMADEE_API_KEY}&page=${page}&limit=100`,
      `https://beta.lomadee.com.br/v1/products?apiKey=${LOMADEE_API_KEY}&page=${page}&limit=100`
    ];

    for (const url of endpoints) {
      console.log(`[Lomadee] Tentando: ${url.substring(0, 60)}...`);

      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          "Accept": "application/json",
          "User-Agent": "CupomHoje/1.0"
        }
      });

      console.log(`[Lomadee] ${url.substring(0, 60)}: ${res.status}`);

      if (res.ok) {
        const text = await res.text();
        const json = JSON.parse(text) as Record<string, unknown>;

        // Tenta diferentes estruturas de resposta
        let data = (json["data"] as Record<string, unknown>[]) ??
                   (json["products"] as Record<string, unknown>[]) ??
                   (json["items"] as Record<string, unknown>[]) ??
                   (json["results"] as Record<string, unknown>[]) ??
                   (Array.isArray(json) ? json : []);

        console.log(`[Lomadee] Encontrados ${data.length} produtos`);

        if (data.length > 0) {
          return data.filter(p => {
            const discount = (p["discount"] as number) ?? (p["discountPercentage"] as number) ?? 0;
            const price = (p["price"] as number) ?? (p["salePrice"] as number) ?? 0;
            return price > 0 && discount > 0;
          });
        }
      }
    }

    console.log(`[Lomadee] Nenhum endpoint funcionou na página ${page}`);
    return [];

  } catch (e) {
    console.error(`[Lomadee] Erro:`, String(e));
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    console.log("[Lomadee] Iniciando sincronização...");

    const supabase = db();
    let totalProducts = 0;
    let totalSynced = 0;
    const merchantIds: Set<string> = new Set();

    // Busca as 3 primeiras páginas (até 300 produtos)
    for (let page = 1; page <= 3; page++) {
      const products = await fetchLomadeeProducts(page);
      if (products.length === 0) break;

      totalProducts += products.length;

      for (const prod of products) {
        const productId = (prod["id"] as string) ?? "";
        const name      = (prod["name"] as string)?.slice(0, 120) ?? "";
        const price     = (prod["price"] as number) ?? 0;
        const original  = (prod["originalPrice"] as number) ?? 0;
        const discount  = (prod["discount"] as number) ?? 0;
        const image     = (prod["image"] as string) ?? "";
        const url       = (prod["url"] as string) ?? "";
        const storeName = (prod["storeName"] as string) ?? "Lomadee";

        if (!productId || !name || !price || !url) continue;

        // Garante que a store existe
        const storeSlug = `lomadee-${storeName.toLowerCase().replace(/\s+/g, "-")}`;
        const { data: store } = await supabase
          .from("stores")
          .upsert({
            slug: storeSlug,
            name: storeName,
            website_url: "https://www.lomadee.com.br",
            affiliate_network: "lomadee",
            is_active: true
          }, { onConflict: "slug" })
          .select("id")
          .single();

        if (!store?.id) continue;
        merchantIds.add(store.id);

        const desc = original > 0
          ? `De R$${Math.round(original)} por R$${Math.round(price)} — ${name}`
          : `R$${Math.round(price)} — ${name}`;

        const { error } = await supabase.from("coupons").upsert({
          store_id:       store.id,
          code:           "",
          description:    desc,
          discount_type:  "percent",
          discount_value: Math.round(discount),
          affiliate_url:  url,
          external_id:    `lomadee-${productId}`,
          image_url:      image,
          is_verified:    true,
          is_active:      true,
          expires_at:     null,
        }, { onConflict: "external_id" });

        if (!error) totalSynced++;
      }
    }

    return NextResponse.json({
      ok: true,
      total_found: totalProducts,
      total_synced: totalSynced,
      unique_stores: merchantIds.size,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    console.error("[Lomadee Sync Error]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
