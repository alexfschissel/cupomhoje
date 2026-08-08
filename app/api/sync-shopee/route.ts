/**
 * GET /api/sync-shopee?secret=XXX
 * Sync Shopee para nicho de miniaturas colecionáveis.
 *
 * Como Shopee bloqueia API pública, gera links de busca diretos.
 * Se você tem programa de afiliados Shopee, configure SHOPEE_AFFILIATE_ID.
 *
 * NICHO: Hot Wheels, Mini GT, Kaido House, Matchbox
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

// Se você tem programa de afiliados Shopee, configure a env var
const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID ?? "";

// Reusa imagens do ML CDN (mesmas do sync-mercadolivre)
const IMG_HOTWHEELS = "https://http2.mlstatic.com/D_NQ_NP_2X_869275-MLB70543594895_072023-F.webp";
const IMG_MINIGT    = "https://http2.mlstatic.com/D_NQ_NP_2X_657541-MLB79604093770_102024-F.webp";
const IMG_KAIDO     = "https://http2.mlstatic.com/D_NQ_NP_2X_960311-MLB82093553797_012025-F.webp";
const IMG_MATCHBOX  = "https://http2.mlstatic.com/D_NQ_NP_2X_809876-MLB79340195683_092024-F.webp";

const NICHO_MINIATURAS = [
  {
    keyword: "hot wheels",
    title: "Hot Wheels — Miniaturas 1:64 na Shopee",
    discount: 30,
    image: IMG_HOTWHEELS,
  },
  {
    keyword: "hot wheels premium",
    title: "Hot Wheels Premium (Car Culture, Boulevard, Team Transport)",
    discount: 25,
    image: IMG_HOTWHEELS,
  },
  {
    keyword: "mini gt",
    title: "Mini GT — Modelos raros 1:64 (LB Works, Porsche, Nissan)",
    discount: 20,
    image: IMG_MINIGT,
  },
  {
    keyword: "kaido house",
    title: "Kaido House — Miniaturas exclusivas JDM",
    discount: 15,
    image: IMG_KAIDO,
  },
  {
    keyword: "matchbox premium",
    title: "Matchbox Collectors / Premium 1:64",
    discount: 25,
    image: IMG_MATCHBOX,
  },
];

function buildShopeeLink(keyword: string): string {
  const base = `https://shopee.com.br/search?keyword=${encodeURIComponent(keyword)}`;
  if (SHOPEE_AFFILIATE_ID) {
    return `${base}&smtt=0.0.9&af_id=${SHOPEE_AFFILIATE_ID}`;
  }
  return base;
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    const { data: store } = await supabase
      .from("stores")
      .upsert({
        slug: "shopee",
        name: "Shopee",
        website_url: "https://shopee.com.br",
        affiliate_network: "shopee",
        logo_url: "https://cf.shopee.com.br/file/6296756c86f4b0e60bab7ef0d6d17bf1",
        is_active: true,
      }, { onConflict: "slug" })
      .select("id")
      .single();

    if (!store?.id) {
      return NextResponse.json({ error: "Falha ao criar store Shopee" }, { status: 500 });
    }

    const coupons: Record<string, unknown>[] = [];
    for (let i = 0; i < NICHO_MINIATURAS.length; i++) {
      const item = NICHO_MINIATURAS[i];
      coupons.push({
        store_id: store.id,
        code: "",
        description: item.title,
        discount_type: "percent",
        discount_value: item.discount,
        affiliate_url: buildShopeeLink(item.keyword),
        external_id: `shopee-nicho-${i}`,
        image_url: item.image,
        is_verified: true,
        is_active: true,
        expires_at: null,
      });
    }

    const { error } = await supabase
      .from("coupons")
      .upsert(coupons, { onConflict: "external_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      total: coupons.length,
      has_affiliate: !!SHOPEE_AFFILIATE_ID,
      note: SHOPEE_AFFILIATE_ID ? "Links com tracking de afiliado" : "Links diretos (configure SHOPEE_AFFILIATE_ID para monetizar)",
      keywords: NICHO_MINIATURAS.map(k => k.keyword),
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
