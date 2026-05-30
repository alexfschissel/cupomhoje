/**
 * GET /api/debug-stats?secret=XXX
 * Stats rápido do banco para debug
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
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Conta por status
    const { count: totalActive } = await supabase
      .from("coupons").select("id", { count: "exact", head: true })
      .eq("is_active", true);

    const { count: withDiscount } = await supabase
      .from("coupons").select("id", { count: "exact", head: true })
      .eq("is_active", true).gt("discount_value", 0);

    const { count: postableNow } = await supabase
      .from("coupons").select("id", { count: "exact", head: true })
      .eq("is_active", true).gt("discount_value", 0)
      .or(`last_posted_at.is.null,last_posted_at.lt.${fourHoursAgo.toISOString()}`);

    // Por loja
    const { data: byStore } = await supabase
      .from("coupons")
      .select("external_id, is_active, discount_value, last_posted_at, stores(name)")
      .eq("is_active", true)
      .limit(500);

    type Row = { external_id: string; is_active: boolean; discount_value: number | null; last_posted_at: string | null; stores: { name?: string } | null };
    const grouped: Record<string, { total: number; withDiscount: number; postable: number }> = {};

    for (const r of (byStore ?? []) as Row[]) {
      const name = r.stores?.name ?? "?";
      if (!grouped[name]) grouped[name] = { total: 0, withDiscount: 0, postable: 0 };
      grouped[name].total++;
      if ((r.discount_value ?? 0) > 0) grouped[name].withDiscount++;
      const postable = (r.discount_value ?? 0) > 0 && (!r.last_posted_at || new Date(r.last_posted_at) < fourHoursAgo);
      if (postable) grouped[name].postable++;
    }

    // Pega 5 ofertas AWIN de exemplo para inspecionar
    const { data: awinSamples } = await supabase
      .from("coupons")
      .select("external_id, description, discount_value, is_active, last_posted_at, affiliate_url, stores(name)")
      .like("external_id", "awin-%")
      .limit(5);

    return NextResponse.json({
      ok: true,
      totals: {
        active: totalActive,
        with_discount: withDiscount,
        postable_now: postableNow,
      },
      by_store: grouped,
      awin_samples: awinSamples,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
