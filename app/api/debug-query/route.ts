/**
 * GET /api/debug-query?secret=XXX
 * Roda a MESMA query do /api/post e mostra distribuição por loja
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S;
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    // MESMA query do /api/post
    const { data: rawData, error } = await supabase
      .from("coupons")
      .select(`
        id, description, discount_value,
        last_posted_at,
        stores ( name )
      `)
      .eq("is_active", true)
      .gt("discount_value", 0)
      .or(`last_posted_at.is.null,last_posted_at.lt.${fourHoursAgo.toISOString()}`)
      .order("last_posted_at", { ascending: true, nullsFirst: true })
      .limit(1500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Helper: extrai store name seja array ou objeto
    const getStoreName = (stores: unknown): string => {
      if (!stores) return "NULL_STORES";
      if (Array.isArray(stores)) {
        const first = stores[0] as { name?: string } | undefined;
        return first?.name ?? "EMPTY_ARRAY";
      }
      return (stores as { name?: string }).name ?? "NO_NAME";
    };

    const byStore: Record<string, { count: number; nullCount: number; samples: string[] }> = {};

    const rows = (rawData ?? []) as Array<Record<string, unknown>>;

    for (const r of rows) {
      const storeName = getStoreName(r.stores);
      if (!byStore[storeName]) byStore[storeName] = { count: 0, nullCount: 0, samples: [] };
      byStore[storeName].count++;
      if (!r.last_posted_at) byStore[storeName].nullCount++;
      if (byStore[storeName].samples.length < 2) {
        const lp = r.last_posted_at as string | null;
        const desc = (r.description as string).slice(0, 50);
        byStore[storeName].samples.push(`[${lp ? lp.slice(0, 10) : 'NULL'}] ${desc}`);
      }
    }

    const sorted = Object.entries(byStore)
      .sort((a, b) => b[1].nullCount - a[1].nullCount);

    return NextResponse.json({
      ok: true,
      total_returned: rows.length,
      stores_count: Object.keys(byStore).length,
      first_5_returned: rows.slice(0, 5).map((r) => ({
        store: getStoreName(r.stores),
        stores_raw_type: Array.isArray(r.stores) ? "array" : typeof r.stores,
        last_posted: r.last_posted_at,
        desc: (r.description as string).slice(0, 50),
      })),
      by_store: Object.fromEntries(sorted.map(([k, v]) => [k, { count: v.count, null_count: v.nullCount, samples: v.samples }])),
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
