/**
 * GET /api/sync-awin-merchants
 * Sincroniza TODAS as 24 lojas AWIN aprovadas com URLs específicas por categoria.
 *
 * Publisher ID: 2909655
 * Total: 24 merchants × ~3-7 categorias = ~100 ofertas variadas
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

const PUBLISHER_ID = 2909655;

// TODAS as 24 lojas aprovadas + múltiplas categorias
const MERCHANTS = [
  // ─── ELETRÔNICOS ───────────────────────────────────────
  {
    id: 18878, name: "Acer BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/18878.png",
    offers: [
      { url: "https://br-store.acer.com/", title: "Acer — Notebooks, Monitores e Gaming", discount: 25 },
      { url: "https://br-store.acer.com/notebooks", title: "Notebooks Acer Aspire e Predator — Até 30% OFF", discount: 30 },
      { url: "https://br-store.acer.com/monitores", title: "Monitores Acer Gaming Nitro — Frame rate alto", discount: 25 },
      { url: "https://br-store.acer.com/desktops", title: "Desktops Acer Aspire — Potência pra trabalho", discount: 20 },
    ],
  },
  {
    id: 33061, name: "LG BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/33061.png",
    offers: [
      { url: "https://www.lg.com/br/ofertas/", title: "LG — Ofertas exclusivas em TVs, Geladeiras e Monitores", discount: 35 },
      { url: "https://www.lg.com/br/tvs/", title: "Smart TVs LG OLED e QNED 4K — Até 37% OFF", discount: 37 },
      { url: "https://www.lg.com/br/monitores/", title: "Monitores LG UltraGear Gaming — Até 29% OFF", discount: 29 },
      { url: "https://www.lg.com/br/geladeiras/", title: "Geladeiras LG InstaView Smart — Frete grátis", discount: 25 },
    ],
  },
  {
    id: 78382, name: "Panasonic BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/78382.png",
    offers: [
      { url: "https://loja.panasonic.com.br/", title: "Panasonic — Eletrodomésticos com até 24% OFF no Pix", discount: 24 },
      { url: "https://loja.panasonic.com.br/lavadoras", title: "Máquinas de Lavar Panasonic 18kg — Pix R$ 2.199", discount: 24 },
      { url: "https://loja.panasonic.com.br/geladeiras", title: "Geladeiras Panasonic Frost Free — 24% OFF", discount: 24 },
    ],
  },
  {
    id: 108628, name: "FastShop B2B BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/108628.png",
    offers: [
      { url: "https://empresas.fastshop.com.br/", title: "FastShop B2B — Tecnologia pra empresas", discount: 20 },
    ],
  },

  // ─── MÓVEIS E CASA ─────────────────────────────────────
  {
    id: 17762, name: "Madeira Madeira BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/17762.png",
    offers: [
      { url: "https://www.madeiramadeira.com.br/", title: "MadeiraMadeira — Móveis e Decoração com frete grátis", discount: 25 },
      { url: "https://www.madeiramadeira.com.br/moveis-quarto", title: "Móveis pra Quarto — Camas, guarda-roupas e cômodas", discount: 30 },
      { url: "https://www.madeiramadeira.com.br/moveis-sala", title: "Móveis pra Sala — Sofás, racks e mesas de centro", discount: 25 },
      { url: "https://www.madeiramadeira.com.br/cozinha", title: "Cozinha Planejada — Armários e gabinetes", discount: 30 },
    ],
  },
  {
    id: 17777, name: "Mobly BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/17777.png",
    offers: [
      { url: "https://www.mobly.com.br", title: "Mobly — Móveis de design por preço justo", discount: 25 },
      { url: "https://www.mobly.com.br/moveis-de-quarto/", title: "Móveis Mobly Quarto — Estilo escandinavo", discount: 30 },
      { url: "https://www.mobly.com.br/moveis-de-sala/", title: "Móveis Mobly Sala — Sofás, poltronas, racks", discount: 25 },
      { url: "https://www.mobly.com.br/decoracao/", title: "Decoração Mobly — Tapetes, almofadas, espelhos", discount: 20 },
    ],
  },
  {
    id: 108626, name: "Arno BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/108626.png",
    offers: [
      { url: "https://www.arno.com.br/", title: "Arno — Liquidificadores, Batedeiras e Cozinha", discount: 30 },
      { url: "https://www.arno.com.br/liquidificador", title: "Liquidificadores Arno Power Mix — Até 30% OFF", discount: 30 },
      { url: "https://www.arno.com.br/batedeira", title: "Batedeiras Arno Planetária — Pratique receitas", discount: 25 },
    ],
  },

  // ─── MODA E ESPORTES ───────────────────────────────────
  {
    id: 112756, name: "Lacoste BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/112756.png",
    offers: [
      { url: "https://www.lacoste.com/br/", title: "Lacoste — Moda Premium com o crocodilo icônico", discount: 25 },
      { url: "https://www.lacoste.com/br/men/", title: "Lacoste Masculino — Polos, Tênis e Acessórios", discount: 30 },
      { url: "https://www.lacoste.com/br/women/", title: "Lacoste Feminino — Coleção exclusiva", discount: 25 },
      { url: "https://www.lacoste.com/br/sale/", title: "Lacoste Outlet — Até 50% OFF em itens selecionados", discount: 50 },
    ],
  },
  {
    id: 51271, name: "Mizuno BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/51271.png",
    offers: [
      { url: "https://www.mizuno.com.br/", title: "Mizuno — Tênis e Equipamentos Esportivos", discount: 30 },
      { url: "https://www.mizuno.com.br/tenis-de-corrida", title: "Tênis Mizuno Wave — Performance em corrida", discount: 30 },
      { url: "https://www.mizuno.com.br/tenis-feminino", title: "Tênis Mizuno Feminino — Conforto e estilo", discount: 25 },
    ],
  },
  {
    id: 79926, name: "Adidas BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/79926.png",
    offers: [
      { url: "https://www.adidas.com.br/", title: "Adidas — Performance e estilo em esportes", discount: 30 },
      { url: "https://www.adidas.com.br/calcados", title: "Tênis Adidas — Originals, Running e Lifestyle", discount: 30 },
      { url: "https://www.adidas.com.br/roupas", title: "Roupas Adidas — Esportivas e Streetwear", discount: 25 },
      { url: "https://www.adidas.com.br/outlet", title: "Adidas Outlet — Até 50% OFF", discount: 50 },
    ],
  },
  {
    id: 86587, name: "Riachuelo BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/86587.png",
    offers: [
      { url: "https://www.riachuelo.com.br/", title: "Riachuelo — Moda pra toda família", discount: 25 },
      { url: "https://www.riachuelo.com.br/feminino", title: "Riachuelo Feminino — Tendências em alta", discount: 30 },
      { url: "https://www.riachuelo.com.br/masculino", title: "Riachuelo Masculino — Camisas, calças e mais", discount: 25 },
      { url: "https://www.riachuelo.com.br/infantil", title: "Riachuelo Kids — Roupas pra crianças", discount: 30 },
    ],
  },
  {
    id: 48557, name: "Elements BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/48557.png",
    offers: [
      { url: "https://www.elements.com.br/", title: "Elements — Moda urbana e contemporânea", discount: 25 },
    ],
  },

  // ─── PET ──────────────────────────────────────────────
  {
    id: 17870, name: "Cobasi BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/17870.png",
    offers: [
      { url: "https://www.cobasi.com.br/", title: "Cobasi — Tudo pro seu pet com frete grátis", discount: 25 },
      { url: "https://www.cobasi.com.br/cachorros", title: "Cobasi Cães — Rações, petiscos e brinquedos", discount: 30 },
      { url: "https://www.cobasi.com.br/gatos", title: "Cobasi Gatos — Areias, rações premium e arranhadores", discount: 30 },
      { url: "https://www.cobasi.com.br/aquarismo", title: "Cobasi Aquarismo — Peixes e equipamentos", discount: 25 },
    ],
  },

  // ─── BELEZA ───────────────────────────────────────────
  {
    id: 125582, name: "Evas BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/125582.png",
    offers: [
      { url: "https://www.evas.com.br/", title: "Evas Perfumaria — 28 anos de tradição em cosméticos", discount: 20 },
      { url: "https://www.evas.com.br/perfumes", title: "Perfumes Importados Evas — Givenchy, Paco Rabanne", discount: 25 },
      { url: "https://www.evas.com.br/maquiagem", title: "Maquiagem Evas — Marcas nacionais e importadas", discount: 20 },
    ],
  },

  // ─── ALIMENTOS ────────────────────────────────────────
  {
    id: 19672, name: "Café L'or BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/19672.png",
    offers: [
      { url: "https://www.cafelor.com.br/", title: "Café L'or — Cápsulas Espresso e Cafés Gourmet", discount: 15 },
      { url: "https://www.cafelor.com.br/capsulas-cafe", title: "Cápsulas de Café L'or — Sabores variados", discount: 20 },
    ],
  },
  {
    id: 17797, name: "DolceGusto BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/17797.png",
    offers: [
      { url: "https://www.nescafe-dolcegusto.com.br/", title: "Dolce Gusto — Máquinas e Cápsulas de Café", discount: 20 },
      { url: "https://www.nescafe-dolcegusto.com.br/capsulas", title: "Cápsulas Dolce Gusto — 30+ sabores", discount: 25 },
      { url: "https://www.nescafe-dolcegusto.com.br/maquinas", title: "Máquinas Dolce Gusto — Espresso em casa", discount: 30 },
    ],
  },

  // ─── BEBIDAS ──────────────────────────────────────────
  {
    id: 112634, name: "Zé Delivery BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/112634.png",
    offers: [
      { url: "https://www.ze.delivery/", title: "Zé Delivery — Bebidas geladas entregues em minutos", discount: 15 },
    ],
  },

  // ─── ESPECIAIS / OUTROS ──────────────────────────────
  {
    id: 17729, name: "Kabum BR (geral)",
    logo: "https://ui.awin.com/images/upload/merchant/profile/17729.png",
    offers: [
      { url: "https://www.kabum.com.br/ofertas", title: "Kabum — Ofertas do dia em tecnologia", discount: 30 },
      { url: "https://www.kabum.com.br/hardware", title: "Hardware Kabum — Placas de vídeo, processadores", discount: 25 },
      { url: "https://www.kabum.com.br/gamer", title: "Kabum Gamer — PCs, teclados, headsets", discount: 25 },
    ],
  },
  {
    id: 30599, name: "Stanley BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/30599.png",
    offers: [
      { url: "https://www.stanley1913.com.br/", title: "Stanley — Garrafas térmicas premium até 30% OFF", discount: 30 },
      { url: "https://www.stanley1913.com.br/copos-canecas", title: "Copos e Canecas Stanley — Térmicos resistentes", discount: 25 },
      { url: "https://www.stanley1913.com.br/garrafas-termicas", title: "Garrafas Térmicas Stanley — 24h gelada/quente", discount: 20 },
    ],
  },
  {
    id: 106747, name: "Alianças Imperiais BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/106747.png",
    offers: [
      { url: "https://www.aliancasimperiais.com.br/", title: "Alianças Imperiais — Casamento e Compromisso", discount: 15 },
      { url: "https://www.aliancasimperiais.com.br/aliancas", title: "Alianças de Moeda Antiga e Prata 4mm/6mm", discount: 20 },
    ],
  },
  {
    id: 127377, name: "VIVÃO - TELECOM BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/127377.png",
    offers: [
      { url: "https://vivao.com.br/", title: "Vivão Telecom — Internet 500 Mega e 5G por R$ 89,90", discount: 20 },
    ],
  },

  // ─── VIAGENS ──────────────────────────────────────────
  {
    id: 32843, name: "GOL Linhas Aéreas",
    logo: "https://ui.awin.com/images/upload/merchant/profile/32843.png",
    offers: [
      { url: "https://www.voegol.com.br/", title: "GOL — Passagens aéreas em promoção", discount: 25 },
      { url: "https://www.voegol.com.br/promocoes", title: "GOL Promoções — Voos a partir de R$ 99", discount: 40 },
    ],
  },
  {
    id: 119147, name: "Trip.com BR",
    logo: "https://ui.awin.com/images/upload/merchant/profile/119147.png",
    offers: [
      { url: "https://br.trip.com", title: "Trip.com — Hotéis, voos e pacotes mundiais", discount: 30 },
      { url: "https://br.trip.com/hotels", title: "Hotéis Trip.com — Até 50% OFF em milhões de hotéis", discount: 50 },
      { url: "https://br.trip.com/flights", title: "Passagens Trip.com — Voos internacionais com desconto", discount: 30 },
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
