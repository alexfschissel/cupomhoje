/**
 * GET /api/debug-kabum?secret=XXX
 * Stats específicos sobre Kabum
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

    // Stats de Kabum
    const { count: totalKabum } = await supabase
      .from("coupons").select("id", { count: "exact", head: true })
      .like("external_id", "kabum-%");

    const { count: activeKabum } = await supabase
      .from("coupons").select("id", { count: "exact", head: true })
      .like("external_id", "kabum-%")
      .eq("is_active", true);

    const { count: withDiscount } = await supabase
      .from("coupons").select("id", { count: "exact", head: true })
      .like("external_id", "kabum-%")
      .eq("is_active", true)
      .gt("discount_value", 0);

    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    const { count: postable } = await supabase
      .from("coupons").select("id", { count: "exact", head: true })
      .like("external_id", "kabum-%")
      .eq("is_active", true)
      .gt("discount_value", 0)
      .or(`last_posted_at.is.null,last_posted_at.lt.${fourHoursAgo.toISOString()}`);

    // Samples
    const { data: samples } = await supabase
      .from("coupons")
      .select("external_id, description, discount_value, is_active, last_posted_at, stores(name, slug)")
      .like("external_id", "kabum-%")
      .limit(5);

    // Verifica todas as lojas com "kabum" no nome
    const { data: allStores } = await supabase
      .from("stores")
      .select("id, name, slug, is_active")
      .or("name.ilike.%kabum%,slug.ilike.%kabum%");

    return NextResponse.json({
      ok: true,
      stats: {
        total: totalKabum,
        active: activeKabum,
        with_discount: withDiscount,
        postable_now: postable,
      },
      stores_found: allStores,
      samples,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
