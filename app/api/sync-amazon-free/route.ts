/**
 * GET /api/sync-amazon-free
 * Scraper Amazon GRATUITO — usa busca pública por keyword
 *
 * Vantagens:
 * - Sem PA-API (não precisa de 10 vendas/mês)
 * - Sem Apify (sem limite $5/mês)
 * - Sem custo
 *
 * Limitação: Amazon pode bloquear (429) se rodar muito frequente.
 * Recomendado: 1-2x/dia, com delay entre buscas.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

const AMAZON_TAG = process.env.AMAZON_ASSOCIATE_ID ?? "cupomhoje2026-20";

// User-Agents rotativos para evitar bloqueio
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36 Edg/122.0",
];

// Buscas variadas (top sellers + ofertas) — cobrindo categorias
const SEARCHES = [
  // Bestsellers diretos
  { url: "https://www.amazon.com.br/gp/bestsellers/electronics", cat: "Eletrônicos" },
  { url: "https://www.amazon.com.br/gp/bestsellers/kitchen", cat: "Cozinha" },
  { url: "https://www.amazon.com.br/gp/bestsellers/computers", cat: "Informática" },
  { url: "https://www.amazon.com.br/gp/bestsellers/hpc", cat: "Saúde" },
  { url: "https://www.amazon.com.br/gp/bestsellers/beauty", cat: "Beleza" },
  { url: "https://www.amazon.com.br/gp/bestsellers/sports", cat: "Esportes" },
];

function amazonLink(asin: string): string {
  return `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_TAG}`;
}

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Filtra produtos lixo
function isValidProduct(title: string, category: string): boolean {
  const t = title.toLowerCase();
  const blocked = [
    "livro", "livros", "ebook", "kindle",
    "adesivo", "etiqueta", "etiquetas",
    "cupom de desconto", "cartão de desconto",
    "fio de chenille", "edition",
    "portuguese edition", "english edition",
    "guia jurídico", "guia juridico",
  ];
  if (blocked.some(w => t.includes(w))) return false;
  // Bloqueia título com "livro" se a categoria for bestsellers
  if (category.toLowerCase().includes("livros")) return false;
  return true;
}

// Parser HTML — extrai produtos das páginas bestseller/search Amazon
function parseProducts(html: string, category: string): Array<{
  asin: string;
  title: string;
  price: number;
  originalPrice: number;
  image: string;
}> {
  const products: Array<{
    asin: string;
    title: string;
    price: number;
    originalPrice: number;
    image: string;
  }> = [];

  // Múltiplos padrões para pegar produtos:
  // 1. Cards bestseller têm data-asin no zg-item
  // 2. Cards de busca têm data-asin em s-result-item

  // Pega blocos com data-asin (até 100 produtos por página)
  const asinRegex = /data-asin="([A-Z0-9]{10})"[\s\S]{0,4000}?(?=data-asin="[A-Z0-9]{10}"|$)/g;
  const matches = html.matchAll(asinRegex);

  for (const match of matches) {
    try {
      const block = match[0];
      const asin = match[1];

      // Título (múltiplos padrões)
      let title = "";
      const titlePatterns = [
        /<h2[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/,
        /<div[^>]*p13n-sc-truncate[^>]*>([^<]+)</,
        /alt="([^"]{20,200})"/,
      ];
      for (const pat of titlePatterns) {
        const m = block.match(pat);
        if (m) { title = m[1].trim(); break; }
      }
      if (!title) continue;

      // Preço atual (BR usa vírgula)
      let price = 0;
      const priceM = block.match(/a-price-whole">([0-9.]+)[\s\S]{0,100}?a-price-fraction">([0-9]+)/);
      if (priceM) {
        const whole = priceM[1].replace(/\./g, "");
        price = parseFloat(`${whole}.${priceM[2]}`);
      } else {
        // Fallback: "R$ 199,90"
        const m = block.match(/R\$\s*([0-9.]+),(\d{2})/);
        if (m) price = parseFloat(`${m[1].replace(/\./g, "")}.${m[2]}`);
      }

      // Preço original (riscado)
      let originalPrice = 0;
      const origM = block.match(/a-text-price[^"]*"[\s\S]{0,200}?R\$\s*([0-9.,]+)</);
      if (origM) {
        originalPrice = parseFloat(origM[1].replace(/\./g, "").replace(",", "."));
      }

      // Imagem
      const imgM = block.match(/<img[^>]*src="(https:\/\/m\.media-amazon\.com\/[^"]+)"/);
      const image = imgM ? imgM[1] : "";

      if (asin && title && price > 5 && isValidProduct(title, category)) {
        products.push({
          asin,
          title: title.slice(0, 150),
          price,
          originalPrice,
          image,
        });
      }
    } catch {
      // ignora produto com erro
    }
  }

  // Dedup por ASIN
  const seen = new Set<string>();
  return products.filter(p => {
    if (seen.has(p.asin)) return false;
    seen.add(p.asin);
    return true;
  });
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    const { data: store } = await supabase
      .from("stores")
      .upsert({
        slug: "amazon",
        name: "Amazon",
        website_url: "https://www.amazon.com.br",
        affiliate_network: "amazon",
        is_active: true,
      }, { onConflict: "slug" })
      .select("id").single();

    if (!store?.id) {
      return NextResponse.json({ error: "Falha ao criar store Amazon" }, { status: 500 });
    }

    let totalScraped = 0;
    let totalSynced = 0;
    const results: Array<{ cat: string; scraped: number; synced: number; error?: string }> = [];

    for (const { url, cat } of SEARCHES) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": pickUA(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
          results.push({ cat, scraped: 0, synced: 0, error: `HTTP ${res.status}` });
          continue;
        }

        const html = await res.text();
        const products = parseProducts(html, cat);
        totalScraped += products.length;

        const coupons = products.map(p => {
          let discount: number | null = null;
          if (p.originalPrice > p.price && p.originalPrice > 0) {
            discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
          }
          if (!discount || discount < 5) discount = 10; // default

          const desc = p.originalPrice > p.price && p.originalPrice > 0
            ? `De R$${Math.round(p.originalPrice)} por R$${Math.round(p.price)} — ${p.title}`
            : `R$${Math.round(p.price)} — ${p.title}`;

          return {
            store_id: store.id,
            code: "",
            description: desc,
            discount_type: "percent",
            discount_value: discount,
            affiliate_url: amazonLink(p.asin),
            external_id: `amz-${p.asin}`,
            image_url: p.image || null,
            is_verified: true,
            is_active: true,
            expires_at: null,
          };
        });

        if (coupons.length > 0) {
          const { error } = await supabase
            .from("coupons")
            .upsert(coupons, { onConflict: "external_id" });
          if (!error) totalSynced += coupons.length;
        }

        results.push({ cat, scraped: products.length, synced: coupons.length });

        // 3-5s entre buscas pra evitar bloqueio
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
      } catch (e) {
        results.push({ cat, scraped: 0, synced: 0, error: String(e).slice(0, 100) });
      }
    }

    return NextResponse.json({
      ok: true,
      total_scraped: totalScraped,
      total_synced: totalSynced,
      categories: results,
      tag: AMAZON_TAG,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
