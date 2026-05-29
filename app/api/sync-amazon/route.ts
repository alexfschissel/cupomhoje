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

// Estrutura real retornada pelo junglee/Amazon-crawler
type ApifyProduct = {
  asin?: string;
  title?: string;
  price?: { value?: number; currency?: string } | number | string | null;
  listPrice?: { value?: number } | number | string | null;
  thumbnailImage?: string;
  image?: string;
  url?: string;
  stars?: number | string | null;
  reviewsCount?: number | null;
  inStock?: boolean;
  categoryPageData?: { saleSummary?: string };
  breadCrumbs?: string;
};

function parsePrice(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") return raw > 0 ? raw : null;
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value?: number }).value;
    return typeof v === "number" && v > 0 ? v : null;
  }
  const n = parseFloat(String(raw).replace(/[^\d.]/g, ""));
  return n > 0 ? n : null;
}

// Filtra produtos LIXO — remove Livros, eBooks, Adesivos, qualquer coisa com "desconto" no título
function isValidProductCategory(breadCrumbs?: string, title?: string): boolean {
  const bc = (breadCrumbs ?? "").toLowerCase();
  const t = (title ?? "").toLowerCase();

  // BLOQUEAR por categoria (breadcrumb)
  const blockedCategories = [
    "livros", "livro",
    "ebook", "kindle", "loja kindle",
    "literatura", "ficção", "ficcão",
    "adesivos", "etiqueta", "etiquetas",
    "liquidação", "liquidacao",
    "cupom", "cupons",
    "cartões", "cartoes",
    "papelaria", "papelaria e escritório",
    "material de escritório",
    "sinalizações",
    "internacionais", // Livros Internacionais
  ];

  if (blockedCategories.some(word => bc.includes(word))) return false;

  // BLOQUEAR por palavras no título (produtos sobre desconto, não COM desconto)
  const blockedTitleWords = [
    "desconto",      // "livros sobre desconto"
    "descontos",
    "adesivo",
    "etiqueta",
    "etiquetas",
    "cupom",
    "cupons",
    "cartão de desconto",
    "fio de chenille",
    "1000 adesivo",
    "500 adesivo",
    "tag de preço",
    "placa de",
    "guia jurídico",
    "guia juridico",
    "guia completo",
    "guia prático",
    "guia pratico",
    "edition",
    "portuguese edition",
    "english edition",
  ];

  if (blockedTitleWords.some(word => t.includes(word))) return false;

  // Aceita só produtos com preço > 0 (filtro extra na função pai)
  return true;
}

function processProduct(p: ApifyProduct, storeId: string) {
  const asin  = p.asin ?? "";
  const title = (p.title ?? "").slice(0, 150);
  if (!asin || !title) return null;
  if (p.inStock === false) return null;

  // Filtra por categoria — remove Livros, Adesivos, etc
  if (!isValidProductCategory(p.breadCrumbs, p.title)) {
    return null;
  }

  // EXIGE PREÇO VÁLIDO — produtos sem preço são lixo
  const saleCheck = parsePrice(p.price);
  if (!saleCheck || saleCheck < 5) return null; // sem preço ou preço < R$5 é suspeito

  const saleNum = parsePrice(p.price);
  const origNum = parsePrice(p.listPrice);

  // Desconto a partir dos preços
  let discountPct: number | null = null;
  if (origNum && saleNum && origNum > saleNum) {
    discountPct = Math.round(((origNum - saleNum) / origNum) * 100);
  }
  // Desconto a partir do categoryPageData (ex: "R$ 20,00 off")
  const saleSummary = p.categoryPageData?.saleSummary ?? "";
  const hasSale = saleSummary.toLowerCase().includes("off") || discountPct !== null;

  // Monta descrição
  const desc = origNum && saleNum && origNum > saleNum
    ? `De R$${origNum.toFixed(0)} por R$${saleNum.toFixed(0)} — ${title}`
    : saleNum
    ? `R$${saleNum.toFixed(0)} — ${title}`
    : title;

  const imageUrl  = p.thumbnailImage ?? p.image ?? null;
  const affiliateUrl = amazonLink(asin, p.url);

  return {
    store_id:       storeId,
    code:           "",
    description:    desc,
    discount_type:  discountPct ? "percent" as const : "other" as const,
    discount_value: discountPct,
    affiliate_url:  affiliateUrl,
    external_id:    `amz-${asin}`,
    image_url:      imageUrl,
    is_verified:    true,
    is_active:      true,
    expires_at:     null,
    // usamos hasSale para log mas não filtramos — todo produto Amazon é válido
    _hasSale:       hasSale,
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

// ── POST — Apify webhook ou chamada manual com datasetId ─────────────────────
export async function POST(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!APIFY_TOKEN)
    return NextResponse.json({ error: "APIFY_TOKEN não configurado" }, { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    let items: ApifyProduct[] = [];
    let datasetId = "";

    // Formato 1: { "datasetId": "xxx" } — chamada manual
    if (body.datasetId) {
      datasetId = body.datasetId;
    }
    // Formato 2: webhook Apify { "resource": { "defaultDatasetId": "xxx" } }
    else if (body.resource?.defaultDatasetId) {
      datasetId = body.resource.defaultDatasetId;
    }
    // Formato 3: array direto (legado)
    else if (Array.isArray(body)) {
      items = body;
    }

    // Busca itens do Apify se tiver dataset ID
    if (datasetId && items.length === 0) {
      const dsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`,
        { signal: AbortSignal.timeout(30000) }
      );
      if (!dsRes.ok)
        return NextResponse.json({ error: `Apify dataset ${dsRes.status}` }, { status: 502 });
      items = await dsRes.json();
    }

    if (items.length === 0)
      return NextResponse.json({ ok: false, msg: "Nenhum produto recebido" });

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

  const coupons: Record<string, unknown>[] = [];
  for (const p of items) {
    try {
      const result = processProduct(p, store.id);
      if (result) {
        // Remove campo interno _hasSale antes de salvar
        const { _hasSale: _ignore, ...coupon } = result as typeof result & { _hasSale?: unknown };
        coupons.push(coupon as Record<string, unknown>);
      }
    } catch {
      // Ignora produto com estrutura inválida
    }
  }

  if (coupons.length === 0)
    return NextResponse.json({ ok: true, synced: 0, msg: `Nenhum produto válido entre ${items.length} recebidos` });

  let synced = 0;
  for (let i = 0; i < coupons.length; i += 20) {
    const { error } = await supabase
      .from("coupons")
      .upsert(coupons.slice(i, i + 20), { onConflict: "external_id" });
    if (!error) synced += Math.min(20, coupons.length - i);
  }

  // Desativa produtos Amazon com mais de 7 dias (usa created_at como proxy)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  await supabase
    .from("coupons")
    .update({ is_active: false })
    .like("external_id", "amz-%")
    .lt("created_at", cutoff.toISOString())
    .neq("is_active", false); // só atualiza os que estão ativos

  return NextResponse.json({
    ok: true,
    received: items.length,
    synced,
    tag: AMAZON_TAG,
    ts: new Date().toISOString(),
  });
}
