/**
 * POST /api/add-product
 * Adiciona produtos específicos do AliExpress ao banco.
 * Extrai preços da URL, gera link de afiliado rastreado e salva no Supabase.
 *
 * Body JSON: { "urls": ["https://pt.aliexpress.com/item/123.html?...", ...] }
 * ou GET:    ?secret=...&url=https://pt.aliexpress.com/item/123.html
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const auth   = req.headers.get("authorization") ?? "";
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S || auth === `Bearer ${S}`;
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Signing AliExpress
function sign(params: Record<string, string>, secret: string) {
  const sorted = Object.keys(params).sort();
  let str = secret;
  for (const k of sorted) str += k + params[k];
  str += secret;
  return createHash("md5").update(str).digest("hex").toUpperCase();
}

// ── Extrai info da URL do AliExpress ─────────────────────────────────────────
function parseAliUrl(rawUrl: string) {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }

  // Product ID do path: /item/1005008821312665.html
  const idMatch = url.pathname.match(/\/item\/(\d+)\.html/);
  if (!idMatch) return null;
  const productId = idMatch[1];

  // Preços do parâmetro pdp_npi
  // Formato: 6@dis!BRL!ORIG!SALE!!!...
  let origPrice: number | null = null;
  let salePrice: number | null = null;

  const npi = url.searchParams.get("pdp_npi") ?? "";
  const priceMatch = npi.match(/[A-Z]{3}!([\d.]+)!([\d.]+)/);
  if (priceMatch) {
    origPrice = parseFloat(priceMatch[1]);
    salePrice = parseFloat(priceMatch[2]);
    // Se os preços forem iguais, sem desconto real
    if (origPrice === salePrice) { origPrice = null; salePrice = null; }
  }

  const cleanUrl = `https://pt.aliexpress.com/item/${productId}.html`;
  return { productId, origPrice, salePrice, cleanUrl };
}

// ── Gera link de afiliado via API ─────────────────────────────────────────────
async function generateAffiliateLink(
  productUrl: string,
  appKey: string,
  appSecret: string,
  trackingId: string,
): Promise<string | null> {
  const timestamp = Date.now().toString();
  const params: Record<string, string> = {
    app_key:              appKey,
    method:               "aliexpress.affiliate.link.generate",
    sign_method:          "md5",
    timestamp,
    v:                    "2.0",
    promotion_link_type:  "0",
    source_values:        productUrl,
  };
  if (trackingId) params.tracking_id = trackingId;
  params.sign = sign(params, appSecret);

  try {
    const res = await fetch("https://api-sg.aliexpress.com/sync", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const json = await res.json() as Record<string, unknown>;
    const resp = json["aliexpress_affiliate_link_generate_response"] as Record<string, unknown> | undefined;
    const result = (resp?.resp_result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
    const links = (result?.promotion_links as Record<string, unknown> | undefined)?.promotion_link as Record<string, unknown>[] | undefined;
    return String(links?.[0]?.promotion_link ?? "") || null;
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const APP_KEY    = process.env.ALIEXPRESS_APP_KEY    ?? "";
  const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET ?? "";
  const TRACKING   = process.env.ALIEXPRESS_TRACKING_ID ?? "";

  if (!APP_KEY || !APP_SECRET)
    return NextResponse.json({ error: "ALIEXPRESS_APP_KEY ou ALIEXPRESS_APP_SECRET não configurados" }, { status: 500 });

  const body = await req.json() as { urls?: string[]; name_prefix?: string };
  const urls  = body.urls ?? [];
  const namePrefix = body.name_prefix ?? "Miniatura de Carro";

  if (urls.length === 0)
    return NextResponse.json({ error: "Envie { urls: ['https://...', ...] } no body" }, { status: 400 });

  const supabase = db();

  // Garante que a loja AliExpress existe
  const { data: store } = await supabase
    .from("stores")
    .upsert({ slug: "aliexpress", name: "AliExpress", website_url: "https://pt.aliexpress.com", affiliate_network: "aliexpress", is_active: true }, { onConflict: "slug" })
    .select("id").single();

  if (!store?.id) return NextResponse.json({ error: "Falha ao criar store AliExpress" }, { status: 500 });

  const results = [];

  for (const rawUrl of urls) {
    const parsed = parseAliUrl(rawUrl);
    if (!parsed) { results.push({ url: rawUrl, ok: false, error: "URL inválida" }); continue; }

    const { productId, origPrice, salePrice, cleanUrl } = parsed;

    // Gera link de afiliado rastreado
    const affiliateLink = await generateAffiliateLink(cleanUrl, APP_KEY, APP_SECRET, TRACKING)
      ?? cleanUrl; // fallback para o link limpo

    // Calcula desconto
    const discount = origPrice && salePrice && origPrice > salePrice
      ? Math.round(((origPrice - salePrice) / origPrice) * 100)
      : null;

    // Monta descrição com preço se disponível
    const desc = origPrice && salePrice && origPrice > salePrice
      ? `De R$${origPrice.toFixed(0)} por R$${salePrice.toFixed(0)} — ${namePrefix} AliExpress`
      : salePrice
      ? `R$${salePrice.toFixed(0)} — ${namePrefix} AliExpress`
      : `${namePrefix} AliExpress`;

    const { error } = await supabase.from("coupons").upsert({
      store_id:       store.id,
      code:           "",
      description:    desc,
      discount_type:  discount ? "percent" : "other",
      discount_value: discount,
      affiliate_url:  affiliateLink,
      external_id:    `ali-manual-${productId}`,
      is_verified:    true,
      is_active:      true,
      expires_at:     null,
    }, { onConflict: "external_id" });

    results.push({
      productId,
      ok:           !error,
      origPrice,
      salePrice,
      discount:     discount ? `${discount}%` : null,
      affiliateLink,
      error:        error?.message,
    });
  }

  return NextResponse.json({
    ok:      results.every(r => r.ok),
    added:   results.filter(r => r.ok).length,
    skipped: results.filter(r => !r.ok).length,
    results,
  });
}

// GET simples para teste com uma URL
export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Passe ?url=https://pt.aliexpress.com/item/..." }, { status: 400 });
  const parsed = parseAliUrl(url);
  return NextResponse.json({ parsed });
}
