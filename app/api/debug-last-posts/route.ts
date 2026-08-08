/**
 * GET /api/debug-last-posts?secret=XXX
 * Mostra os últimos 15 produtos postados (para debug de imagens/miniaturas)
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

    const { data, error } = await supabase
      .from("coupons")
      .select("id, description, external_id, image_url, affiliate_url, last_posted_at, stores(name)")
      .not("last_posted_at", "is", null)
      .order("last_posted_at", { ascending: false })
      .limit(15);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []).map((r: Record<string, unknown>) => {
      const stores = r.stores as { name?: string } | { name?: string }[] | null;
      const storeName = Array.isArray(stores) ? stores[0]?.name : stores?.name;
      return {
        store: storeName ?? "?",
        external_id: r.external_id,
        desc: (r.description as string).substring(0, 80),
        image_url: (r.image_url as string)?.substring(0, 100),
        image_ok: !!(r.image_url as string)?.startsWith("http"),
        last_posted: r.last_posted_at,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
