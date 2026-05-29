/**
 * POST /api/add-mercadolivre
 * Adiciona produtos do Mercado Livre manualmente com links de afiliado.
 *
 * Body: { "products": [{ "url": "https://meli.la/...", "title": "...", "price": 100, "original_price": 200 }, ...] }
 */

import { createClient } from "@supabase/supabase-js";
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

export async function POST(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    products?: Array<{
      url: string;
      title: string;
      price?: number;
      original_price?: number;
    }>
  };
  const products = body.products ?? [];

  if (products.length === 0)
    return NextResponse.json({ error: "Envie { products: [{ url, title, price?, original_price? }, ...] }" }, { status: 400 });

  const supabase = db();

  // Garante que a loja Mercado Livre existe
  const { data: store } = await supabase
    .from("stores")
    .upsert({
      slug: "mercadolivre",
      name: "Mercado Livre",
      website_url: "https://www.mercadolivre.com.br",
      affiliate_network: "mercadolivre",
      is_active: true
    }, { onConflict: "slug" })
    .select("id").single();

  if (!store?.id) return NextResponse.json({ error: "Falha ao criar store Mercado Livre" }, { status: 500 });

  const results = [];

  for (const prod of products) {
    const { url, title, price, original_price } = prod;
    if (!url || !title) {
      results.push({ title, ok: false, error: "URL e title obrigatórios" });
      continue;
    }

    // Calcula desconto se tiver preço original
    const discount = original_price && price && original_price > price
      ? Math.round(((original_price - price) / original_price) * 100)
      : null;

    // Monta descrição
    const desc = original_price && price && original_price > price
      ? `De R$${Math.round(original_price)} por R$${Math.round(price)} — ${title}`
      : price
      ? `R$${Math.round(price)} — ${title}`
      : title;

    // Extrai um ID único da URL para external_id
    const urlId = url.split("/").pop() ?? `ml-${Date.now()}`;

    const { error } = await supabase.from("coupons").upsert({
      store_id:       store.id,
      code:           "",
      description:    desc,
      discount_type:  discount ? "percent" : "other",
      discount_value: discount,
      affiliate_url:  url,
      external_id:    `ml-${urlId}`,
      is_verified:    true,
      is_active:      true,
      expires_at:     null,
    }, { onConflict: "external_id" });

    results.push({
      title,
      ok:       !error,
      price,
      discount: discount ? `${discount}%` : null,
      error:    error?.message,
    });
  }

  return NextResponse.json({
    ok:      results.every(r => r.ok),
    added:   results.filter(r => r.ok).length,
    skipped: results.filter(r => !r.ok).length,
    results,
  });
}
