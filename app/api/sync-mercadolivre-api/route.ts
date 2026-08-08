/**
 * GET /api/sync-mercadolivre-api?secret=XXX
 * Sync Mercado Livre para nicho de miniaturas colecionáveis.
 *
 * ML bloqueou API pública anônima em 2025. Usa links de busca estáticos com tracking de afiliado.
 * Env: MERCADOLIVRE_TRACKING_ID (usa "96MBNZ-LQA4" como fallback)
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

const ML_TRACKING_ID = process.env.MERCADOLIVRE_TRACKING_ID ?? "96MBNZ-LQA4";

const NICHO_MINIATURAS = [
  {
    keyword: "hot wheels",
    title: "Hot Wheels — Miniaturas 1:64 no Mercado Livre",
    discount: 30,
  },
  {
    keyword: "hot wheels premium",
    title: "Hot Wheels Premium (Car Culture, Boulevard, Team Transport)",
    discount: 25,
  },
  {
    keyword: "hot wheels fast furious",
    title: "Hot Wheels Fast & Furious — Coleção completa",
    discount: 30,
  },
  {
    keyword: "mini gt",
    title: "Mini GT — LB Works, Nissan Silvia, Porsche, BMW",
    discount: 20,
  },
  {
    keyword: "mini gt kaido house",
    title: "Kaido House x Mini GT — Modelos exclusivos JDM",
    discount: 15,
  },
  {
    keyword: "matchbox",
    title: "Matchbox — Miniaturas clássicas 1:64",
    discount: 25,
  },
  {
    keyword: "matchbox premium",
    title: "Matchbox Collectors / Premium",
    discount: 25,
  },
];

function buildMLSearchLink(keyword: string): string {
  const q = encodeURIComponent(keyword);
  const base = `https://lista.mercadolivre.com.br/${keyword.replace(/\s+/g, "-")}#D[A:${q}]`;
  return `${base}&c_id=${ML_TRACKING_ID}`;
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    const { data: store } = await supabase
      .from("stores")
      .upsert({
        slug: "mercadolivre",
        name: "Mercado Livre",
        website_url: "https://www.mercadolivre.com.br",
        affiliate_network: "mercadolivre",
        logo_url: "https://http2.mlstatic.com/frontend-assets/ui-navigation/6.6.116/mercadolibre/logo__large_plus.png",
        is_active: true,
      }, { onConflict: "slug" })
      .select("id")
      .single();

    if (!store?.id) {
      return NextResponse.json({ error: "Falha ao criar store ML" }, { status: 500 });
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
        affiliate_url: buildMLSearchLink(item.keyword),
        external_id: `ml-nicho-${i}`,
        image_url: "https://http2.mlstatic.com/frontend-assets/ui-navigation/6.6.116/mercadolibre/logo__large_plus.png",
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
      tracking_id: ML_TRACKING_ID,
      keywords: NICHO_MINIATURAS.map(k => k.keyword),
      note: "Links de busca ML com tracking de afiliado (API anônima do ML foi descontinuada em 2025)",
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
