/**
 * GET /api/sync-amazon-free
 * Scraper Amazon GRÁTIS — usa fetch direto na busca da Amazon BR
 * Não precisa de Apify, não tem limite de uso
 *
 * Limitação: Amazon pode bloquear (429) se rodar com muita frequência.
 * Recomendado: rodar 1x/dia
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

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// URLs de busca por categoria com filtro de OFERTAS RELÂMPAGO
const CATEGORY_URLS = [
  { url: "https://www.amazon.com.br/s?i=electronics&rh=p_n_deal_type%3A23565035011", cat: "Eletrônicos" },
  { url: "https://www.amazon.com.br/s?i=computers&rh=p_n_deal_type%3A23565035011", cat: "Informática" },
  { url: "https://www.amazon.com.br/s?i=kitchen&rh=p_n_deal_type%3A23565035011", cat: "Cozinha" },
  { url: "https://www.amazon.com.br/s?i=hpc&rh=p_n_deal_type%3A23565035011", cat: "Saúde" },
  { url: "https://www.amazon.com.br/s?i=beauty&rh=p_n_deal_type%3A23565035011", cat: "Beleza" },
  { url: "https://www.amazon.com.br/s?i=sports&rh=p_n_deal_type%3A23565035011", cat: "Esportes" },
  { url: "https://www.amazon.com.br/s?i=toys&rh=p_n_deal_type%3A23565035011", cat: "Brinquedos" },
];

function amazonLink(asin: string): string {
  return `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_TAG}`;
}

// Parse HTML da Amazon BR para extrair produtos
function parseAmazonHTML(html: string): Array<{
  asin: string;
  title: string;
  price: number;
  originalPrice: number;
  image: string;
  url: string;
}> {
  const products: Array<{
    asin: string;
    title: string;
    price: number;
    originalPrice: number;
    image: string;
    url: string;
  }> = [];

  // Regex para encontrar cards de produtos (data-asin)
  const cardRegex = /data-asin="([A-Z0-9]{10})"[\s\S]*?(?=data-asin="[A-Z0-9]{10}"|$)/g;
  const matches = html.match(cardRegex) ?? [];

  for (const card of matches) {
    try {
      const asinMatch = card.match(/data-asin="([A-Z0-9]{10})"/);
      if (!asinMatch) continue;
      const asin = asinMatch[1];

      // Título
      const titleMatch = card.match(/<h2[^>]*>[\s\S]*?<span>([^<]+)<\/span>/);
      const title = titleMatch ? titleMatch[1].trim() : "";

      // Preço atual (com vírgula em BR)
      const priceMatch = card.match(/a-price-whole">([0-9.]+)<[\s\S]*?a-price-fraction">([0-9]+)/);
      const price = priceMatch
        ? parseFloat(`${priceMatch[1].replace(/\./g, "")}.${priceMatch[2]}`)
        : 0;

      // Preço original (riscado)
      const origMatch = card.match(/a-text-price[^"]*"[\s\S]*?a-offscreen">R\$\s*([0-9.,]+)</);
      const originalPrice = origMatch
        ? parseFloat(origMatch[1].replace(/\./g, "").replace(",", "."))
        : 0;

      // Imagem
      const imgMatch = card.match(/<img[^>]*src="([^"]+)"[^>]*class="s-image"/);
      const image = imgMatch ? imgMatch[1] : "";

      if (asin && title && price > 5) {
        products.push({
          asin,
          title: title.slice(0, 150),
          price,
          originalPrice,
          image,
          url: amazonLink(asin),
        });
      }
    } catch {
      // Pula card com erro
    }
  }

  return products;
}

// Filtra produtos lixo
function isValidProduct(title: string): boolean {
  const t = title.toLowerCase();
  const blocked = [
    "livro", "livros", "ebook", "kindle",
    "adesivo", "etiqueta", "etiquetas",
    "cupom", "cartão de desconto",
    "fio de chenille", "edition",
  ];
  return !blocked.some(w => t.includes(w));
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    // Garante store Amazon
    const { data: store } = await supabase
      .from("stores")
      .upsert({
        slug: "amazon",
        name: "Amazon",
        website_url: "https://www.amazon.com.br",
        affiliate_network: "amazon",
        is_active: true
      }, { onConflict: "slug" })
      .select("id").single();

    if (!store?.id) return NextResponse.json({ error: "Falha ao criar store Amazon" }, { status: 500 });

    let totalScraped = 0;
    let totalSynced = 0;
    const results: Array<{ cat: string; scraped: number; synced: number; error?: string }> = [];

    // Scrape cada categoria
    for (const { url, cat } of CATEGORY_URLS) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
          },
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
          results.push({ cat, scraped: 0, synced: 0, error: `HTTP ${res.status}` });
          continue;
        }

        const html = await res.text();
        const products = parseAmazonHTML(html);
        const valid = products.filter(p => isValidProduct(p.title));

        totalScraped += valid.length;

        // Salva no banco
        const coupons = valid.map(p => {
          const discount = p.originalPrice > p.price
            ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
            : null;

          const desc = p.originalPrice > p.price
            ? `De R$${p.originalPrice.toFixed(0)} por R$${p.price.toFixed(0)} — ${p.title}`
            : `R$${p.price.toFixed(0)} — ${p.title}`;

          return {
            store_id: store.id,
            code: "",
            description: desc,
            discount_type: discount ? "percent" : "other",
            discount_value: discount,
            affiliate_url: p.url,
            external_id: `amz-${p.asin}`,
            image_url: p.image,
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

        results.push({ cat, scraped: valid.length, synced: coupons.length });

        // Aguarda 3s entre categorias para não tomar bloqueio
        await new Promise(r => setTimeout(r, 3000));
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
