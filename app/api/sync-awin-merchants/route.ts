/**
 * GET /api/sync-awin-merchants
 * Sincroniza ofertas dos 10 merchants AWIN aprovados.
 * Cria múltiplas entradas por loja (categorias diferentes).
 *
 * Publisher ID: 2909655
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

const PUBLISHER_ID = 2909655; // Medical Planner LTDA — descoberto via AWIN API

// 10 merchants aprovados + ofertas por categoria
const MERCHANTS = [
  {
    id: 19672,
    name: "Café L'or BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/19672.png",
    offers: [
      { url: "https://www.cafelor.com.br/", title: "Café L'or — Cápsulas Espresso e Cafés Gourmet", discount: 15 },
      { url: "https://www.cafelor.com.br/capsulas-cafe", title: "Cápsulas de Café L'or — Sabores variados", discount: 20 },
    ],
  },
  {
    id: 30599,
    name: "Stanley BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/30599.png",
    offers: [
      { url: "https://www.stanley1913.com.br/", title: "Stanley — Garrafas térmicas premium até 30% OFF", discount: 30 },
      { url: "https://www.stanley1913.com.br/copos-canecas", title: "Copos e Canecas Stanley — Térmicos resistentes", discount: 25 },
      { url: "https://www.stanley1913.com.br/garrafas-termicas", title: "Garrafas Térmicas Stanley — 24h gelada/quente", discount: 20 },
    ],
  },
  {
    id: 33061,
    name: "LG BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/33061.png",
    offers: [
      { url: "https://www.lg.com/br/ofertas/", title: "LG — Ofertas exclusivas em TVs, Geladeiras e Monitores", discount: 35 },
      { url: "https://www.lg.com/br/tvs/", title: "Smart TVs LG OLED e QNED 4K — Até 37% OFF", discount: 37 },
      { url: "https://www.lg.com/br/monitores/", title: "Monitores LG UltraGear Gaming — Até 29% OFF", discount: 29 },
      { url: "https://www.lg.com/br/geladeiras/", title: "Geladeiras LG InstaView Smart — Frete grátis", discount: 25 },
      { url: "https://www.lg.com/br/celulares/", title: "Celulares e Acessórios LG", discount: 20 },
    ],
  },
  {
    id: 78382,
    name: "Panasonic BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/78382.png",
    offers: [
      { url: "https://loja.panasonic.com.br/", title: "Panasonic — Eletrodomésticos com até 24% OFF no Pix", discount: 24 },
      { url: "https://loja.panasonic.com.br/lavadoras", title: "Máquinas de Lavar Panasonic 18kg — Pix R$ 2.199", discount: 24 },
      { url: "https://loja.panasonic.com.br/geladeiras", title: "Geladeiras Panasonic Frost Free 407L — 24% OFF", discount: 24 },
      { url: "https://loja.panasonic.com.br/microondas", title: "Micro-ondas Panasonic 34L Antibactéria — 20% OFF", discount: 20 },
      { url: "https://loja.panasonic.com.br/ar-condicionado", title: "Ar Condicionado Panasonic Inverter — Economia até 60%", discount: 30 },
    ],
  },
  {
    id: 106747,
    name: "Alianças Imperiais BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/106747.png",
    offers: [
      { url: "https://www.aliancasimperiais.com.br/", title: "Alianças Imperiais — Casamento, Noivado e Compromisso", discount: 15 },
      { url: "https://www.aliancasimperiais.com.br/aliancas", title: "Alianças de Casamento em Moeda Antiga e Prata", discount: 20 },
    ],
  },
  {
    id: 108626,
    name: "Arno BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/108626.png",
    offers: [
      { url: "https://www.arno.com.br/", title: "Arno — Liquidificadores, Batedeiras e Cozinha", discount: 30 },
      { url: "https://www.arno.com.br/liquidificador", title: "Liquidificadores Arno Power Mix — Até 30% OFF", discount: 30 },
      { url: "https://www.arno.com.br/batedeira", title: "Batedeiras Arno Planetária — Pratique receitas", discount: 25 },
      { url: "https://www.arno.com.br/ventilador", title: "Ventiladores Arno Silence Force — 6 velocidades", discount: 20 },
    ],
  },
  {
    id: 112634,
    name: "Zé Delivery BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/112634.png",
    offers: [
      { url: "https://www.ze.delivery/", title: "Zé Delivery — Bebidas geladas entregues em minutos", discount: 15 },
    ],
  },
  {
    id: 112756,
    name: "Lacoste BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/112756.png",
    offers: [
      { url: "https://www.lacoste.com/br/", title: "Lacoste — Moda Premium com o crocodilo icônico", discount: 25 },
      { url: "https://www.lacoste.com/br/men/", title: "Lacoste Masculino — Polos, Tênis e Acessórios", discount: 30 },
      { url: "https://www.lacoste.com/br/women/", title: "Lacoste Feminino — Coleção exclusiva", discount: 25 },
      { url: "https://www.lacoste.com/br/sale/", title: "Lacoste Outlet — Até 50% OFF em itens selecionados", discount: 50 },
    ],
  },
  {
    id: 125582,
    name: "Evas BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/125582.png",
    offers: [
      { url: "https://www.evas.com.br/", title: "Evas Perfumaria — 28 anos de tradição em cosméticos", discount: 20 },
      { url: "https://www.evas.com.br/perfumes", title: "Perfumes Importados Evas — Marcas premium", discount: 25 },
      { url: "https://www.evas.com.br/maquiagem", title: "Maquiagem Evas — Marcas nacionais e importadas", discount: 20 },
    ],
  },
  {
    id: 127377,
    name: "VIVÃO - TELECOM BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/127377.png",
    offers: [
      { url: "https://vivao.com.br/", title: "Vivão Telecom — Planos de Internet e Telefonia", discount: 20 },
    ],
  },
];

function buildAwinLink(merchantId: number, productUrl: string): string {
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${PUBLISHER_ID}&p=${encodeURIComponent(productUrl)}`;
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();
    let totalSynced = 0;
    const results: Record<string, unknown>[] = [];

    for (const merchant of MERCHANTS) {
      // Garante store
      const slug = `awin-${merchant.id}`;
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .upsert({
          slug,
          name: merchant.name,
          logo_url: merchant.logo,
          website_url: merchant.offers[0].url,
          affiliate_id: String(merchant.id),
          affiliate_network: "awin",
          is_active: true,
        }, { onConflict: "slug" })
        .select("id")
        .single();

      if (storeError || !store?.id) {
        results.push({ merchant: merchant.name, status: "error", message: storeError?.message ?? "no store id" });
        continue;
      }

      // Cria 1 cupom por oferta da loja
      const coupons: Record<string, unknown>[] = [];
      for (let i = 0; i < merchant.offers.length; i++) {
        const offer = merchant.offers[i];
        coupons.push({
          store_id:       store.id,
          code:           "",
          description:    offer.title,
          discount_type:  "percent",
          discount_value: offer.discount,
          affiliate_url:  buildAwinLink(merchant.id, offer.url),
          external_id:    `awin-${merchant.id}-${i}`,
          image_url:      merchant.logo,
          is_verified:    true,
          is_active:      true,
          expires_at:     null,
        });
      }

      const { error } = await supabase
        .from("coupons")
        .upsert(coupons, { onConflict: "external_id" });

      if (error) {
        results.push({ merchant: merchant.name, status: "error", message: error.message });
      } else {
        totalSynced += coupons.length;
        results.push({ merchant: merchant.name, status: "ok", synced: coupons.length });
      }
    }

    return NextResponse.json({
      ok: true,
      publisher_id: PUBLISHER_ID,
      total_merchants: MERCHANTS.length,
      total_synced: totalSynced,
      results,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
