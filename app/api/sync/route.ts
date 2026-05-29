import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function ok(req: NextRequest) {
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

function toSlug(name: string, suffix: string) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    + "-" + suffix;
}

// ── AWIN ─────────────────────────────────────────────────────────────────────
async function syncAwin(supabase: ReturnType<typeof db>) {
  const PID = process.env.AWIN_PUBLISHER_ID;
  const TOK = process.env.AWIN_API_TOKEN;
  if (!PID || !TOK) return { synced: 0, skipped: 0, error: "AWIN não configurado" };

  // Sem filtros — busca qualquer promoção dos anunciantes aprovados
  const res = await fetch(
    `https://api.awin.com/publishers/${PID}/promotions`,
    { headers: { Authorization: `Bearer ${TOK}` }, cache: "no-store" }
  );

  if (!res.ok) {
    const detail = await res.text();
    return { synced: 0, skipped: 0, error: `AWIN ${res.status}: ${detail}` };
  }

  const json = await res.json() as { promotions?: Record<string, unknown>[] };
  const promos = json.promotions ?? [];
  if (promos.length === 0) return { synced: 0, skipped: 0, error: "Nenhuma promoção AWIN disponível para anunciantes aprovados" };

  let synced = 0, skipped = 0;

  for (const p of promos.slice(0, 300)) {
    const advertiserId   = String(p.advertiserId ?? "");
    const advertiserName = String(p.advertiserName ?? "Loja");
    const promoId        = String(p.promotionId ?? p.id ?? "");
    if (!advertiserId || !promoId) { skipped++; continue; }

    const { data: store } = await supabase
      .from("stores")
      .upsert({ slug: toSlug(advertiserName, `aw-${advertiserId}`), name: advertiserName, affiliate_id: advertiserId, affiliate_network: "awin", is_active: true }, { onConflict: "slug" })
      .select("id").single();
    if (!store?.id) { skipped++; continue; }

    const rawType      = String(p.discountType ?? p.type ?? "").toLowerCase();
    const discountType = rawType.includes("percent") ? "percent" : rawType.includes("cash") || rawType.includes("fixed") ? "fixed" : rawType.includes("ship") ? "free_shipping" : "other";
    const discountValue = (p.discountAmount as { amount?: number } | null)?.amount ?? null;
    const advertUrl     = String(p.advertiserUrl ?? "");
    const affiliateUrl  = `https://www.awin1.com/cread.php?awinmid=${advertiserId}&awinaffid=${PID}&p=${encodeURIComponent(advertUrl)}`;

    const { error } = await supabase.from("coupons").upsert({
      store_id: store.id, code: String(p.code ?? ""),
      description: String(p.description ?? p.displayTitle ?? p.title ?? "Promoção"),
      discount_type: discountType, discount_value: discountValue,
      affiliate_url: affiliateUrl, external_id: `awin-${promoId}`,
      is_verified: true, is_active: true,
      expires_at: p.endDate ? new Date(String(p.endDate)).toISOString() : null,
    }, { onConflict: "external_id" });

    error ? skipped++ : synced++;
  }

  return { synced, skipped };
}

// ── LOMADEE ───────────────────────────────────────────────────────────────────
async function syncLomadee(supabase: ReturnType<typeof db>) {
  const TOKEN = process.env.LOMADEE_APP_TOKEN;
  if (!TOKEN) return { synced: 0, skipped: 0, error: "LOMADEE_APP_TOKEN não configurado" };

  const res = await fetch(
    `https://api.lomadee.com/v3/${TOKEN}/coupon/_all?sourceId=cupomhoje&token=${TOKEN}`,
    { cache: "no-store" }
  );

  if (!res.ok) return { synced: 0, skipped: 0, error: `Lomadee ${res.status}` };

  const json = await res.json() as { coupons?: Record<string, unknown>[] };
  const coupons = json.coupons ?? [];
  if (coupons.length === 0) return { synced: 0, skipped: 0, error: "Nenhum cupom Lomadee retornado" };

  let synced = 0, skipped = 0;

  for (const c of coupons.slice(0, 500)) {
    const store    = c.store as Record<string, unknown> | null;
    const storeId  = String(store?.id ?? "");
    const storeName = String(store?.name ?? "Loja");
    const couponId  = String(c.id ?? "");
    if (!storeId || !couponId) { skipped++; continue; }

    const { data: storeRow } = await supabase
      .from("stores")
      .upsert({
        slug: toSlug(storeName, `lm-${storeId}`),
        name: storeName,
        logo_url: String(store?.thumbnail ?? ""),
        website_url: String(store?.link ?? ""),
        affiliate_id: storeId,
        affiliate_network: "lomadee",
        is_active: true,
      }, { onConflict: "slug" })
      .select("id").single();
    if (!storeRow?.id) { skipped++; continue; }

    const desc = String(c.description ?? "").toUpperCase();
    const discountType =
      desc.includes("%")                          ? "percent"      :
      desc.includes("FRETE GRÁTIS") || desc.includes("FRETE GRATIS") ? "free_shipping" :
      desc.includes("R$")                         ? "fixed"        : "other";
    const discountValue =
      discountType === "percent" ? parseFloat(desc.match(/(\d+)%/)?.[1] ?? "0") :
      discountType === "fixed"   ? parseFloat(desc.match(/R\$\s?(\d+)/)?.[1] ?? "0") : null;

    const { error } = await supabase.from("coupons").upsert({
      store_id: storeRow.id,
      code: String(c.code ?? ""),
      description: String(c.description ?? "Cupom Lomadee"),
      discount_type: discountType,
      discount_value: discountValue,
      affiliate_url: String(c.link ?? ""),
      external_id: `lm-${couponId}`,
      is_verified: true,
      is_active: true,
      expires_at: c.vigency ? new Date(String(c.vigency)).toISOString() : null,
    }, { onConflict: "external_id" });

    error ? skipped++ : synced++;
  }

  return { synced, skipped };
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)  missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0)
    return NextResponse.json({ error: "Variáveis faltando no Vercel", missing }, { status: 500 });

  try {
    const supabase = db();

    const [awin, lomadee] = await Promise.allSettled([
      syncAwin(supabase),
      syncLomadee(supabase),
    ]);

    // Desativa cupons expirados
    await supabase.from("coupons")
      .update({ is_active: false })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true);

    return NextResponse.json({
      ok: true,
      awin:    awin.status    === "fulfilled" ? awin.value    : { error: String(awin.reason)    },
      lomadee: lomadee.status === "fulfilled" ? lomadee.value : { error: String(lomadee.reason) },
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
