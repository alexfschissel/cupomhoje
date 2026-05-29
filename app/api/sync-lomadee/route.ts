/**
 * GET /api/sync-lomadee
 * Sincroniza cupons do Lomadee via API pública
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

const LOMADEE_API_KEY = "fFmWad3OVvCgFi3um7YZfjQ6u1sQ4ImI";

async function fetchLomaDeeCoupons(): Promise<Record<string, unknown>[]> {
  try {
    // Endpoint da API Lomadee
    const url = `https://api.lomadee.com.br/v1/coupons?apiKey=${LOMADEE_API_KEY}&limit=100&orderBy=-discount`;

    console.log("[Lomadee] Buscando cupons...");
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "CupomHoje/1.0" }
    });

    if (!res.ok) {
      console.error(`[Lomadee] ${res.status}: ${await res.text().then(t => t.substring(0, 100))}`);
      return [];
    }

    const json = await res.json() as Record<string, unknown>;
    const coupons = (json["coupons"] as Record<string, unknown>[]) ??
                    (json["data"] as Record<string, unknown>[]) ??
                    (Array.isArray(json) ? json : []);

    console.log(`[Lomadee] Encontrados ${coupons.length} cupons`);
    return coupons;

  } catch (e) {
    console.error("[Lomadee]", String(e));
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

    for (const coupon of coupons) {
      const id    = (coupon["id"] as string) ?? "";
      const title = (coupon["title"] as string)?.slice(0, 120) ?? "";
      const url   = (coupon["url"] as string) ?? "";
      const store = (coupon["store"] as string) ?? "Lomadee";
      const desc  = (coupon["description"] as string)?.slice(0, 150) ?? "";

      if (!id || !title || !url) continue;

      const { data: s } = await supabase
        .from("stores")
        .upsert({
          slug: `lomadee-${store.toLowerCase().replace(/\s+/g, "-")}`,
          name: store,
          website_url: "https://www.lomadee.com.br",
          affiliate_network: "lomadee",
          is_active: true
        }, { onConflict: "slug" })
        .select("id")
        .single();

      if (!s?.id) continue;
      stores.add(store);

      const { error } = await supabase.from("coupons").upsert({
        store_id: s.id,
        code: title,
        description: desc,
        discount_type: "other",
        discount_value: null,
        affiliate_url: url,
        external_id: `lomadee-${id}`,
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
