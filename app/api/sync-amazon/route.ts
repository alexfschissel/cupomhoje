/**
 * POST /api/sync-amazon
 * Recebe dados do Apify (Amazon scraper) e salva no banco com link de afiliado.
 *
 * Configure no Apify:
 *  Webhook → POST https://cupomhoje.vercel.app/api/sync-amazon?secret=SEU_SECRET
 *  Payload template: usar os campos padrão do actor
 *
 * GET /api/sync-amazon → dispara manualmente via API Apify
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const AMAZON_TAG = process.env.AMAZON_ASSOCIATE_ID ?? "cupomhoje2026-20";
const APIFY_TOKEN = process.env.APIFY_TOKEN ?? "";
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? "BG3WDrGdteHgZgbPK";

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

// Constrói link de afiliado Amazon com o tag
function amazonLink(asin: string, url?: string): string {
  if (url && url.includes("amazon.com.br")) {
    const u = new URL(url);
    u.searchParams.set("tag", AMAZON_TAG);
    // Remove parâmetros de rastreamento desnecessários
    ["ref", "psc", "smid", "spLa"].forEach(p => u.searchParams.delete(p));
    return u.toString();
  }
  return `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_TAG}`;
}

type ApifyProduct = {
  asin?: string;
  title?: string;
  name?: string;
  price?: number | string;
  listPrice?: number | string;
  originalPrice?: number | string;
  discountedPrice?: number | string;
  savings?: number | string;
  savingsPercentage?: number | string;
  thumbnailImage?: string;
  image?: string;
  url?: string;
  stars?: number | string;
  reviewsCount?: number | string;
};

function processProduct(p: ApifyProduct, storeId: string) {
  const asin  = p.asin ?? "";
  const title = (p.title ?? p.name ?? "").slice(0, 150);
  if (!asin || !title) return null;

  // Preços — Apify pode retornar em vários formatos
  const saleNum = parseFloat(String(p.price ?? p.discountedPrice ?? "0").replace(/[^\d.]/g, "")) || null;
  const origNum = parseFloat(String(p.listPrice ?? p.originalPrice ?? "0").replace(/[^\d.]/g, "")) || null;

  // % de desconto
  let discountPct: number | null = null;
  if (p.savingsPercentage) {
    discountPct = parseFloat(String(p.savingsPercentage).replace(/[^\d.]/g, "")) || null;
  } else if (origNum && saleNum && origNum > saleNum) {
    discountPct = Math.round(((origNum - saleNum) / origNum) * 100);
  }

  // Só importa se tiver desconto real
  if (!discountPct || discountPct < 5) return null;

  const desc = origNum && saleNum && origNum > saleNum
    ? `De R$${origNum.toFixed(0)} por R$${saleNum.toFixed(0)} — ${title}`
    : title;

  const imageUrl = p.thumbnailImage ?? p.image ?? null;
  const affiliateUrl = amazonLink(asin, p.url);

  return {
    store_id:       storeId,
    code:           "",
    description:    desc,
    discount_type:  "percent" as const,
    discount_value: discountPct,
    affiliate_url:  affiliateUrl,
    external_id:    `amz-${asin}`,
    image_url:      imageUrl,
    is_verified:    true,
    is_active:      true,
    expires_at:     null,
  };
}

// ── GET — dispara o actor Apify e processa resultado ─────────────────────────
export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!APIFY_TOKEN)
    return NextResponse.json({ error: "APIFY_TOKEN não configurado no Vercel" }, { status: 500 });

  try {
    // 1. Dispara o actor Apify e aguarda resultado
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Configuração do actor Amazon Deals Scraper
          country: "BR",
          maxItems: 50,
          // O actor lê sua configuração salva no Apify Console
        }),
        signal: AbortSignal.timeout(130000),
      }
    );

    if (!runRes.ok) {
      const err = await runRes.text();
      return NextResponse.json({ error: `Apify error ${runRes.status}`, detail: err.slice(0, 300) }, { status: 502 });
    }

    const items = await runRes.json() as ApifyProduct[];
    return await saveProducts(items);

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST — Apify envia via webhook ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    // Webhook do Apify: { resource: { defaultDatasetId }, eventData }
    // OU array direto de produtos
    let items: ApifyProduct[] = [];

    if (Array.isArray(body)) {
      items = body;
    } else if (body.resource?.defaultDatasetId && APIFY_TOKEN) {
      // Busca os itens do dataset via API
      const dsRes = await fetch(
        `https://api.apify.com/v2/datasets/${body.resource.defaultDatasetId}/items?token=${APIFY_TOKEN}&format=json`,
        { signal: AbortSignal.timeout(30000) }
      );
      if (dsRes.ok) items = await dsRes.json();
    }

    if (items.length === 0)
      return NextResponse.json({ ok: false, msg: "Nenhum produto recebido do Apify" });

    return await saveProducts(items);

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── Salva produtos no Supabase ────────────────────────────────────────────────
async function saveProducts(items: ApifyProduct[]) {
  const supabase = db();

  const { data: store } = await supabase
    .from("stores")
    .upsert({ slug: "amazon", name: "Amazon", website_url: "https://www.amazon.com.br", affiliate_network: "amazon", is_active: true }, { onConflict: "slug" })
    .select("id").single();

  if (!store?.id) return NextResponse.json({ error: "Falha ao criar store Amazon" }, { status: 500 });

  const coupons = items
    .map(p => processProduct(p, store.id))
    .filter((c): c is NonNullable<ReturnType<typeof processProduct>> => c !== null);

  if (coupons.length === 0)
    return NextResponse.json({ ok: true, synced: 0, msg: `Nenhum produto com desconto ≥5% entre ${items.length} recebidos` });

  let synced = 0;
  for (let i = 0; i < coupons.length; i += 20) {
    const { error } = await supabase
      .from("coupons")
      .upsert(coupons.slice(i, i + 20), { onConflict: "external_id" });
    if (!error) synced += Math.min(20, coupons.length - i);
  }

  // Desativa produtos Amazon expirados (mais de 7 dias sem atualização)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  await supabase
    .from("coupons")
    .update({ is_active: false })
    .like("external_id", "amz-%")
    .lt("updated_at", cutoff.toISOString());

  return NextResponse.json({
    ok: true,
    received: items.length,
    synced,
    tag: AMAZON_TAG,
    ts: new Date().toISOString(),
  });
}
