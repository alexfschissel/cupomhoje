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

    type Row = {
      id: string;
      description: string;
      discount_value: number;
      last_posted_at: string | null;
      stores: { name?: string } | null;
    };

    const byStore: Record<string, { count: number; nullCount: number; samples: string[] }> = {};

    for (const r of (rawData ?? []) as Row[]) {
      const storeName = r.stores?.name ?? "UNKNOWN";
      if (!byStore[storeName]) byStore[storeName] = { count: 0, nullCount: 0, samples: [] };
      byStore[storeName].count++;
      if (!r.last_posted_at) byStore[storeName].nullCount++;
      if (byStore[storeName].samples.length < 2) {
        byStore[storeName].samples.push(`[${r.last_posted_at ? r.last_posted_at.slice(0, 10) : 'NULL'}] ${r.description.slice(0, 50)}`);
      }
    }

    // Top stores by NULL count (essas deveriam aparecer primeiro!)
    const sorted = Object.entries(byStore)
      .sort((a, b) => b[1].nullCount - a[1].nullCount);

    return NextResponse.json({
      ok: true,
      total_returned: rawData?.length ?? 0,
      stores_count: Object.keys(byStore).length,
      first_5_returned: (rawData ?? []).slice(0, 5).map((r: Row) => ({
        store: r.stores?.name,
        last_posted: r.last_posted_at,
        desc: r.description.slice(0, 50),
      })),
      by_store: Object.fromEntries(sorted.map(([k, v]) => [k, { count: v.count, null_count: v.nullCount, samples: v.samples }])),
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
