import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// ── auth ─────────────────────────────────────────────────────────────────────
function ok(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const auth   = req.headers.get("authorization") ?? "";
  const S = process.env.SYNC_SECRET  ?? "";
  const C = process.env.CRON_SECRET  ?? "";
  return secret === S || auth === `Bearer ${S}` || auth === `Bearer ${C}`;
}

// ── supabase client (service role, sem SSR) ───────────────────────────────────
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── AWIN sync ────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const PID = process.env.AWIN_PUBLISHER_ID;
  const TOK = process.env.AWIN_API_TOKEN;

  if (!PID || !TOK)
    return NextResponse.json({ error: "AWIN_PUBLISHER_ID ou AWIN_API_TOKEN não configurados" }, { status: 500 });

  // 1. Busca promoções na API do AWIN
  const res = await fetch(
    `https://api.awin.com/publishers/${PID}/promotions?type=voucher&regionCode=BR&relationship=joined`,
    { headers: { Authorization: `Bearer ${TOK}` }, cache: "no-store" }
  );

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: `AWIN retornou ${res.status}`, detail }, { status: 502 });
  }

  const json = await res.json() as { promotions?: Record<string, unknown>[] };
  const promos = json.promotions ?? [];

  if (promos.length === 0)
    return NextResponse.json({ ok: true, synced: 0, msg: "AWIN não retornou promoções — verifique se está aprovado em algum anunciante BR" });

  const supabase = db();
  let synced = 0;
  let skipped = 0;

  for (const p of promos.slice(0, 300)) {
    const advertiserId   = String(p.advertiserId   ?? "");
    const advertiserName = String(p.advertiserName ?? "Loja");
    const promoId        = String(p.promotionId    ?? p.id ?? "");

    if (!advertiserId || !promoId) { skipped++; continue; }

    // 2. Cria / atualiza store pelo slug
    const slug =
      advertiserName
        .toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-aw-" + advertiserId;

    const { data: store } = await supabase
      .from("stores")
      .upsert(
        { slug, name: advertiserName, affiliate_id: advertiserId, affiliate_network: "awin", is_active: true },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (!store?.id) { skipped++; continue; }

    // 3. Monta cupom
    const rawType     = String(p.discountType ?? p.type ?? "").toLowerCase();
    const discountType =
      rawType.includes("percent") ? "percent" :
      rawType.includes("cash") || rawType.includes("fixed") ? "fixed" :
      rawType.includes("ship") ? "free_shipping" : "other";

    const discountValue = (p.discountAmount as { amount?: number } | null)?.amount ?? null;
    const advertUrl     = String(p.advertiserUrl ?? "");
    const affiliateUrl  =
      `https://www.awin1.com/cread.php?awinmid=${advertiserId}&awinaffid=${PID}&p=${encodeURIComponent(advertUrl)}`;

    // 4. Upsert do cupom (exige unique index em external_id — ver README)
    const { error } = await supabase.from("coupons").upsert(
      {
        store_id:       store.id,
        code:           String(p.code ?? ""),
        description:    String(p.description ?? p.displayTitle ?? p.title ?? "Promoção"),
        discount_type:  discountType,
        discount_value: discountValue,
        affiliate_url:  affiliateUrl,
        external_id:    `awin-${promoId}`,
        is_verified:    true,
        is_active:      true,
        expires_at:     p.endDate ? new Date(String(p.endDate)).toISOString() : null,
      },
      { onConflict: "external_id" }
    );

    if (error) { skipped++; }
    else { synced++; }
  }

  // 5. Desativa cupons expirados
  await supabase
    .from("coupons")
    .update({ is_active: false })
    .lt("expires_at", new Date().toISOString())
    .eq("is_active", true);

  return NextResponse.json({ ok: true, total: promos.length, synced, skipped, ts: new Date().toISOString() });
}
