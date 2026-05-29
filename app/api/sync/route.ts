import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
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

// ── AliExpress signing ────────────────────────────────────────────────────────
function signAliExpress(params: Record<string, string>, secret: string): string {
  // AliExpress TOP API usa MD5: SECRET + sorted_kvs + SECRET
  const sorted = Object.keys(params).sort();
  let str = secret;
  for (const key of sorted) str += key + params[key];
  str += secret;
  return createHash("md5").update(str).digest("hex").toUpperCase();
}

// ── AliExpress — busca por keyword com filtros de qualidade ──────────────────
async function fetchAliExpressKeyword(
  keyword: string,
  APP_KEY: string,
  APP_SECRET: string,
  TRACKING: string,
): Promise<Record<string, unknown>[]> {
  const timestamp = Date.now().toString();

  // Faixa de preço configurável via env (padrão: miniaturas R$20–R$500)
  const minPrice = process.env.ALIEXPRESS_MIN_PRICE ?? "20";
  const maxPrice = process.env.ALIEXPRESS_MAX_PRICE ?? "500";

  const params: Record<string, string> = {
    app_key:         APP_KEY,
    method:          "aliexpress.affiliate.hotproduct.query", // Advanced API aprovada
    sign_method:     "md5",
    timestamp,
    v:               "2.0",
    keywords:        keyword,
    page_no:         "1",
    page_size:       "40",              // busca mais para filtrar melhor
    target_currency: "BRL",
    target_language: "PT",
    sort:            "DISCOUNT_DESC",   // maior desconto primeiro
    min_sale_price:  minPrice,
    max_sale_price:  maxPrice,
  };
  if (TRACKING) params.tracking_id = TRACKING;
  params.sign = signAliExpress(params, APP_SECRET);

  const res = await fetch("https://api-sg.aliexpress.com/sync", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(params).toString(),
    signal:  AbortSignal.timeout(15000),
  });

  if (!res.ok) return [];

  const json = await res.json() as Record<string, unknown>;
  const resp   = (json["aliexpress_affiliate_hotproduct_query_response"]
               ?? json["aliexpress_affiliate_product_query_response"]) as Record<string, unknown> | undefined;
  const result = (resp?.resp_result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
  const list   = (result?.products as Record<string, unknown> | undefined)?.product;

  if (!Array.isArray(list)) return [];

  // Filtro de qualidade local: mínimo 10% de desconto + avaliação ≥ 4 estrelas (80%)
  const MIN_DISCOUNT = parseInt(process.env.ALIEXPRESS_MIN_DISCOUNT ?? "10");
  const MIN_RATING   = parseFloat(process.env.ALIEXPRESS_MIN_RATING ?? "80");

  return list.filter((p: Record<string, unknown>) => {
    const discountPct = parseFloat(String(p.discount ?? "0").replace("%",""));
    const rating      = parseFloat(String(p.evaluate_rate ?? "0").replace("%",""));
    return discountPct >= MIN_DISCOUNT && (rating === 0 || rating >= MIN_RATING);
  });
}

// ── AliExpress sync principal ─────────────────────────────────────────────────
async function syncAliExpress(supabase: ReturnType<typeof db>) {
  const APP_KEY    = process.env.ALIEXPRESS_APP_KEY;
  const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET;
  const TRACKING   = process.env.ALIEXPRESS_TRACKING_ID ?? "";

  if (!APP_KEY || !APP_SECRET)
    return { synced: 0, skipped: 0, error: "ALIEXPRESS_APP_KEY ou ALIEXPRESS_APP_SECRET não configurados" };

  // Palavras-chave configuráveis via env var (separadas por vírgula)
  const rawKeywords = process.env.ALIEXPRESS_KEYWORDS
    ?? "kaido house miniature,mini gt diecast,hot wheels diecast,tomica car,matchbox diecast,kyosho mini car,1:64 scale diecast,miniature car model,diecast car collection,hobby car miniature";
  const keywords = rawKeywords.split(",").map(k => k.trim()).filter(Boolean);

  try {
    // Busca cada keyword em paralelo
    const results = await Promise.allSettled(
      keywords.map(kw => fetchAliExpressKeyword(kw, APP_KEY, APP_SECRET, TRACKING))
    );

    // Combina e deduplica por product_id
    const seen = new Set<string>();
    const products: Record<string, unknown>[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const p of r.value) {
          const id = String(p.product_id ?? "");
          if (id && !seen.has(id)) { seen.add(id); products.push(p); }
        }
      }
    }

    if (products.length === 0)
      return { synced: 0, skipped: 0, keywords, error: "Nenhum produto encontrado para as palavras-chave" };

    // Garante que a loja AliExpress existe
    const { data: aliStore } = await supabase
      .from("stores")
      .upsert({ slug: "aliexpress", name: "AliExpress", website_url: "https://aliexpress.com", affiliate_network: "aliexpress", is_active: true }, { onConflict: "slug" })
      .select("id").single();

    if (!aliStore?.id) return { synced: 0, skipped: 0, error: "Falha ao criar loja AliExpress" };

    let synced = 0, skipped = 0, firstError = "";

    for (const p of products) {
      const productId   = String(p.product_id ?? "");
      const title       = String(p.product_title ?? "").slice(0, 150);
      const discountStr = String(p.discount ?? "").replace("%", "");
      const discount    = parseFloat(discountStr) || null;

      // Preços — Advanced API retorna "BRL 67.80", remove letras e espaços
      const saleRaw  = String(p.target_sale_price     ?? "").replace(/[^\d.]/g, "");
      const origRaw  = String(p.target_original_price ?? "").replace(/[^\d.]/g, "");
      const salePrice = parseFloat(saleRaw) > 0 ? parseFloat(saleRaw) : null;
      const origPrice = parseFloat(origRaw) > 0 ? parseFloat(origRaw) : null;

      if (!productId) { skipped++; continue; }

      // Imagem
      const imageUrl = String(p.product_main_image_url ?? "").trim() || null;

      // Link: Advanced API já retorna promotion_link rastreado
      const promoLink =
        String(p.promotion_link     ?? "").trim() ||
        String(p.product_detail_url ?? "").trim() ||
        `https://pt.aliexpress.com/item/${productId}.html`;

      // Descrição com preços reais
      const desc = origPrice && salePrice && origPrice > salePrice
        ? `De R$${origPrice.toFixed(0)} por R$${salePrice.toFixed(0)} — ${title}`
        : salePrice
        ? `R$${salePrice.toFixed(0)} — ${title}`
        : title;

      const { error } = await supabase.from("coupons").upsert({
        store_id:       aliStore.id,
        code:           "",
        description:    desc,
        discount_type:  discount ? "percent" : "other",
        discount_value: discount,
        affiliate_url:  promoLink,
        external_id:    `ali-${productId}`,
        image_url:      imageUrl,
        is_verified:    true,
        is_active:      true,
        expires_at:     null,
      }, { onConflict: "external_id" });

      if (error) { skipped++; firstError = firstError || error.message; }
      else { synced++; }
    }

    return { synced, skipped, keywords, ...(firstError ? { upsert_error: firstError } : {}) };

  } catch (e) {
    return { synced: 0, skipped: 0, error: `AliExpress erro: ${String(e)}` };
  }
}

// ── AWIN ─────────────────────────────────────────────────────────────────────
async function syncAwin(supabase: ReturnType<typeof db>) {
  const PID = process.env.AWIN_PUBLISHER_ID;
  const TOK = process.env.AWIN_API_TOKEN;
  if (!PID || !TOK) return { synced: 0, skipped: 0, error: "AWIN não configurado" };

  try {
    const res = await fetch(
      `https://api.awin.com/publishers/${PID}/promotions`,
      { headers: { Authorization: `Bearer ${TOK}` }, cache: "no-store", signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) {
      const t = await res.text();
      return { synced: 0, skipped: 0, error: `AWIN ${res.status}: ${t.slice(0, 200)}` };
    }

    const json = await res.json() as { promotions?: Record<string, unknown>[] };
    const promos = json.promotions ?? [];
    if (promos.length === 0) return { synced: 0, skipped: 0, error: "Nenhuma promoção AWIN disponível" };

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
  } catch (e) {
    return { synced: 0, skipped: 0, error: String(e) };
  }
}

// ── LOMADEE ───────────────────────────────────────────────────────────────────
async function syncLomadee(supabase: ReturnType<typeof db>) {
  const TOKEN = process.env.LOMADEE_APP_TOKEN;
  if (!TOKEN) return { synced: 0, skipped: 0, error: "LOMADEE_APP_TOKEN não configurado" };

  try {
    const res = await fetch(
      `https://api.lomadee.com/v3/${TOKEN}/coupon/_all`,
      { cache: "no-store", signal: AbortSignal.timeout(20000),
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
    );
    if (!res.ok) {
      const t = await res.text();
      return { synced: 0, skipped: 0, error: `Lomadee ${res.status}: ${t.slice(0, 200)}` };
    }

    const json = await res.json() as { coupons?: Record<string, unknown>[] };
    const coupons = json.coupons ?? [];
    if (coupons.length === 0) return { synced: 0, skipped: 0, error: "Nenhum cupom Lomadee" };

    let synced = 0, skipped = 0;
    for (const c of coupons.slice(0, 500)) {
      const store     = c.store as Record<string, unknown> | null;
      const storeId   = String(store?.id ?? "");
      const storeName = String(store?.name ?? "Loja");
      const couponId  = String(c.id ?? "");
      if (!storeId || !couponId) { skipped++; continue; }

      const { data: storeRow } = await supabase
        .from("stores")
        .upsert({ slug: toSlug(storeName, `lm-${storeId}`), name: storeName, logo_url: String(store?.thumbnail ?? ""), website_url: String(store?.link ?? ""), affiliate_id: storeId, affiliate_network: "lomadee", is_active: true }, { onConflict: "slug" })
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
        store_id: storeRow.id, code: String(c.code ?? ""),
        description: String(c.description ?? "Cupom"), discount_type: discountType, discount_value: discountValue,
        affiliate_url: String(c.link ?? ""), external_id: `lm-${couponId}`,
        is_verified: true, is_active: true,
        expires_at: c.vigency ? new Date(String(c.vigency)).toISOString() : null,
      }, { onConflict: "external_id" });

      error ? skipped++ : synced++;
    }
    return { synced, skipped };
  } catch (e) {
    return { synced: 0, skipped: 0, error: `Lomadee fetch falhou: ${String(e)}` };
  }
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)  missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0)
    return NextResponse.json({ error: "Variáveis faltando", missing }, { status: 500 });

  try {
    const supabase = db();

    const [aliResult, awinResult, lomadeeResult] = await Promise.allSettled([
      syncAliExpress(supabase),
      syncAwin(supabase),
      syncLomadee(supabase),
    ]);

    await supabase.from("coupons")
      .update({ is_active: false })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true);

    return NextResponse.json({
      ok:       true,
      aliexpress: aliResult.status    === "fulfilled" ? aliResult.value    : { error: String(aliResult.reason)    },
      awin:       awinResult.status   === "fulfilled" ? awinResult.value   : { error: String(awinResult.reason)   },
      lomadee:    lomadeeResult.status === "fulfilled" ? lomadeeResult.value : { error: String(lomadeeResult.reason) },
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
