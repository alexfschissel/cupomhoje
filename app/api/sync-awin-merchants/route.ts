/**
 * GET /api/sync-awin-merchants
 * Sincroniza TODAS as 52 lojas AWIN aprovadas com URLs específicas por categoria.
 *
 * Publisher ID: 2909655
 * Total: 52 merchants × ~2-5 categorias = ~150 ofertas variadas
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
const L = (id: number) => `https://ui.awin.com/images/upload/merchant/profile/${id}.png`;

// TODAS as 52 lojas aprovadas + múltiplas categorias por loja
const MERCHANTS = [
  // ─── ELETRÔNICOS / TECH ────────────────────────────────
  { id: 18878, name: "Acer BR", logo: L(18878), offers: [
    { url: "https://br-store.acer.com/", title: "Acer — Notebooks, Monitores e Gaming", discount: 25 },
    { url: "https://br-store.acer.com/notebooks", title: "Notebooks Acer Aspire e Predator — Até 30% OFF", discount: 30 },
    { url: "https://br-store.acer.com/monitores", title: "Monitores Acer Gaming Nitro", discount: 25 },
    { url: "https://br-store.acer.com/desktops", title: "Desktops Acer Aspire", discount: 20 },
  ]},
  { id: 33061, name: "LG BR", logo: L(33061), offers: [
    { url: "https://www.lg.com/br/ofertas/", title: "LG — Ofertas exclusivas em TVs, Geladeiras e Monitores", discount: 35 },
    { url: "https://www.lg.com/br/tvs/", title: "Smart TVs LG OLED e QNED 4K — Até 37% OFF", discount: 37 },
    { url: "https://www.lg.com/br/monitores/", title: "Monitores LG UltraGear Gaming — Até 29% OFF", discount: 29 },
    { url: "https://www.lg.com/br/geladeiras/", title: "Geladeiras LG InstaView Smart — Frete grátis", discount: 25 },
  ]},
  { id: 78382, name: "Panasonic BR", logo: L(78382), offers: [
    { url: "https://loja.panasonic.com.br/", title: "Panasonic — Eletrodomésticos com até 24% OFF no Pix", discount: 24 },
    { url: "https://loja.panasonic.com.br/lavadoras", title: "Máquinas de Lavar Panasonic 18kg — Pix R$ 2.199", discount: 24 },
    { url: "https://loja.panasonic.com.br/geladeiras", title: "Geladeiras Panasonic Frost Free — 24% OFF", discount: 24 },
  ]},
  { id: 25539, name: "Samsung BR", logo: L(25539), offers: [
    { url: "https://shop.samsung.com/br/desconto-samsung", title: "Samsung — Descontos exclusivos em Galaxy, TVs e mais", discount: 30 },
    { url: "https://shop.samsung.com/br/smartphones", title: "Galaxy S24, Z Fold e Flip — Até 20% OFF", discount: 20 },
    { url: "https://shop.samsung.com/br/tvs", title: "Smart TVs Samsung Neo QLED — Até 30% OFF", discount: 30 },
  ]},
  { id: 17858, name: "Electrolux BR", logo: L(17858), offers: [
    { url: "https://loja.electrolux.com.br/", title: "Electrolux — Eletrodomésticos com frete grátis", discount: 25 },
    { url: "https://loja.electrolux.com.br/geladeiras", title: "Geladeiras Electrolux Frost Free — Até 25% OFF", discount: 25 },
    { url: "https://loja.electrolux.com.br/lavadoras", title: "Lava-e-Seca Electrolux — Economize com Pix", discount: 20 },
  ]},
  { id: 31355, name: "iPlace BR", logo: L(31355), offers: [
    { url: "https://www.iplace.com.br/", title: "iPlace — Apple oficial com garantia estendida", discount: 15 },
    { url: "https://www.iplace.com.br/iphone", title: "iPhone 15/16 com condições exclusivas", discount: 15 },
    { url: "https://www.iplace.com.br/mac", title: "MacBook e Mac Studio — Até 12x sem juros", discount: 10 },
  ]},
  { id: 118761, name: "JBL BR", logo: L(118761), offers: [
    { url: "https://www.jbl.com.br/", title: "JBL — Caixas de som, fones e portáteis", discount: 30 },
    { url: "https://www.jbl.com.br/fones-bluetooth", title: "Fones JBL Tune, Live e Endurance — Até 30% OFF", discount: 30 },
    { url: "https://www.jbl.com.br/caixas-de-som", title: "Caixas JBL Charge, Flip e Boombox", discount: 25 },
  ]},
  { id: 108628, name: "FastShop B2B BR", logo: L(108628), offers: [
    { url: "https://empresas.fastshop.com.br/", title: "FastShop B2B — Tecnologia pra empresas", discount: 20 },
  ]},

  // ─── MÓVEIS E CASA ─────────────────────────────────────
  { id: 17762, name: "Madeira Madeira BR", logo: L(17762), offers: [
    { url: "https://www.madeiramadeira.com.br/", title: "MadeiraMadeira — Móveis e Decoração com frete grátis", discount: 25 },
    { url: "https://www.madeiramadeira.com.br/moveis-quarto", title: "Móveis pra Quarto — Camas, guarda-roupas e cômodas", discount: 30 },
    { url: "https://www.madeiramadeira.com.br/moveis-sala", title: "Móveis pra Sala — Sofás, racks e mesas", discount: 25 },
    { url: "https://www.madeiramadeira.com.br/cozinha", title: "Cozinha Planejada — Armários e gabinetes", discount: 30 },
  ]},
  { id: 17777, name: "Mobly BR", logo: L(17777), offers: [
    { url: "https://www.mobly.com.br", title: "Mobly — Móveis de design por preço justo", discount: 25 },
    { url: "https://www.mobly.com.br/moveis-de-quarto/", title: "Móveis Mobly Quarto — Estilo escandinavo", discount: 30 },
    { url: "https://www.mobly.com.br/moveis-de-sala/", title: "Móveis Mobly Sala — Sofás, poltronas, racks", discount: 25 },
    { url: "https://www.mobly.com.br/decoracao/", title: "Decoração Mobly — Tapetes, almofadas, espelhos", discount: 20 },
  ]},
  { id: 36382, name: "Tok & Stok BR", logo: L(36382), offers: [
    { url: "https://www.tokstok.com.br/", title: "Tok & Stok — Design que cabe no bolso", discount: 30 },
    { url: "https://www.tokstok.com.br/sala", title: "Sofás Tok & Stok — Conforto e design", discount: 30 },
    { url: "https://www.tokstok.com.br/quarto", title: "Móveis pra Quarto — Estilo contemporâneo", discount: 25 },
    { url: "https://www.tokstok.com.br/decoracao", title: "Decoração Tok & Stok — Modernize sua casa", discount: 25 },
  ]},
  { id: 108626, name: "Arno BR", logo: L(108626), offers: [
    { url: "https://www.arno.com.br/", title: "Arno — Liquidificadores, Batedeiras e Cozinha", discount: 30 },
    { url: "https://www.arno.com.br/liquidificador", title: "Liquidificadores Arno Power Mix — Até 30% OFF", discount: 30 },
    { url: "https://www.arno.com.br/batedeira", title: "Batedeiras Arno Planetária", discount: 25 },
  ]},
  { id: 25279, name: "Brinox BR", logo: L(25279), offers: [
    { url: "https://www.brinox.com.br", title: "Brinox — Utilidades pra cozinha e casa", discount: 25 },
    { url: "https://www.brinox.com.br/panelas", title: "Panelas Brinox Antiaderentes — Até 30% OFF", discount: 30 },
    { url: "https://www.brinox.com.br/organizadores", title: "Organizadores Brinox — Cozinha e closet", discount: 20 },
  ]},
  { id: 26113, name: "Polishop BR", logo: L(26113), offers: [
    { url: "https://www.polishop.com.br/", title: "Polishop — Beleza, saúde e cozinha inteligente", discount: 30 },
    { url: "https://www.polishop.com.br/beleza", title: "Beleza Polishop — Massageadores, depiladores", discount: 30 },
    { url: "https://www.polishop.com.br/cozinha", title: "Cozinha Polishop — Air Fryers e utensílios", discount: 25 },
  ]},

  // ─── MODA / ROUPAS ────────────────────────────────────
  { id: 112756, name: "Lacoste BR", logo: L(112756), offers: [
    { url: "https://www.lacoste.com/br/", title: "Lacoste — Moda Premium com o crocodilo icônico", discount: 25 },
    { url: "https://www.lacoste.com/br/men/", title: "Lacoste Masculino — Polos, Tênis e Acessórios", discount: 30 },
    { url: "https://www.lacoste.com/br/women/", title: "Lacoste Feminino — Coleção exclusiva", discount: 25 },
    { url: "https://www.lacoste.com/br/sale/", title: "Lacoste Outlet — Até 50% OFF", discount: 50 },
  ]},
  { id: 86587, name: "Riachuelo BR", logo: L(86587), offers: [
    { url: "https://www.riachuelo.com.br/", title: "Riachuelo — Moda pra toda família", discount: 25 },
    { url: "https://www.riachuelo.com.br/feminino", title: "Riachuelo Feminino — Tendências em alta", discount: 30 },
    { url: "https://www.riachuelo.com.br/masculino", title: "Riachuelo Masculino — Camisas, calças e mais", discount: 25 },
    { url: "https://www.riachuelo.com.br/infantil", title: "Riachuelo Kids — Roupas pra crianças", discount: 30 },
  ]},
  { id: 17801, name: "Lojas Renner B2B BR", logo: L(17801), offers: [
    { url: "https://www.lojasrenner.com.br", title: "Renner — Moda contemporânea pra você", discount: 25 },
    { url: "https://www.lojasrenner.com.br/feminino", title: "Renner Feminino — Tendências em alta", discount: 30 },
    { url: "https://www.lojasrenner.com.br/masculino", title: "Renner Masculino — Look completo", discount: 25 },
    { url: "https://www.lojasrenner.com.br/outlet", title: "Renner Outlet — Preços incríveis", discount: 50 },
  ]},
  { id: 17697, name: "Dafiti BR", logo: L(17697), offers: [
    { url: "https://www.dafiti.com.br/", title: "Dafiti — Moda de várias marcas em um só lugar", discount: 30 },
    { url: "https://www.dafiti.com.br/feminino", title: "Dafiti Feminino — Roupas e acessórios", discount: 40 },
    { url: "https://www.dafiti.com.br/masculino", title: "Dafiti Masculino — Roupas e sneakers", discount: 30 },
    { url: "https://www.dafiti.com.br/outlet", title: "Dafiti Outlet — Até 70% OFF", discount: 70 },
  ]},
  { id: 100553, name: "Calvin Klein BR", logo: L(100553), offers: [
    { url: "https://www.calvinklein.com.br/", title: "Calvin Klein — Moda premium contemporânea", discount: 30 },
    { url: "https://www.calvinklein.com.br/masculino", title: "Calvin Klein Masculino — Cuecas, camisas e mais", discount: 30 },
    { url: "https://www.calvinklein.com.br/feminino", title: "Calvin Klein Feminino — Roupas íntimas e casual", discount: 30 },
  ]},
  { id: 17846, name: "Diesel BR", logo: L(17846), offers: [
    { url: "https://br.diesel.com/", title: "Diesel — Jeans e streetwear premium", discount: 30 },
    { url: "https://br.diesel.com/men", title: "Diesel Masculino — Jeans e camisetas premium", discount: 30 },
    { url: "https://br.diesel.com/women", title: "Diesel Feminino — Streetwear autêntico", discount: 30 },
  ]},
  { id: 124520, name: "Guess BR", logo: L(124520), offers: [
    { url: "https://www.guessbrasil.com.br/", title: "Guess — Moda premium americana", discount: 30 },
    { url: "https://www.guessbrasil.com.br/feminino", title: "Guess Feminino — Roupas e bolsas icônicas", discount: 30 },
    { url: "https://www.guessbrasil.com.br/masculino", title: "Guess Masculino — Camisetas e relógios", discount: 30 },
  ]},
  { id: 121392, name: "Aramis BR", logo: L(121392), offers: [
    { url: "https://www.aramis.com.br/", title: "Aramis — Alfaiataria masculina moderna", discount: 25 },
    { url: "https://www.aramis.com.br/camisas", title: "Camisas Aramis — Sob medida e casuais", discount: 30 },
    { url: "https://www.aramis.com.br/ternos", title: "Ternos Aramis — Estilo e elegância", discount: 20 },
  ]},
  { id: 104715, name: "Animale BR", logo: L(104715), offers: [
    { url: "https://www.animale.com.br/", title: "Animale — Moda feminina premium brasileira", discount: 30 },
    { url: "https://www.animale.com.br/vestidos", title: "Vestidos Animale — Coleção exclusiva", discount: 30 },
  ]},
  { id: 116455, name: "Maria Filó BR", logo: L(116455), offers: [
    { url: "https://www.mariafilo.com.br/", title: "Maria Filó — Moda feminina delicada e chic", discount: 25 },
    { url: "https://www.mariafilo.com.br/vestidos", title: "Vestidos Maria Filó — Estilo romântico", discount: 30 },
  ]},
  { id: 48557, name: "Elements BR", logo: L(48557), offers: [
    { url: "https://www.elements.com.br/", title: "Elements — Moda urbana e contemporânea", discount: 25 },
  ]},
  { id: 70965, name: "Intimissimi BR", logo: L(70965), offers: [
    { url: "https://www.intimissimi.com.br/mulher", title: "Intimissimi — Lingerie italiana refinada", discount: 30 },
    { url: "https://www.intimissimi.com.br/mulher/lingerie", title: "Lingerie Intimissimi — Conjuntos elegantes", discount: 30 },
    { url: "https://www.intimissimi.com.br/mulher/pijamas", title: "Pijamas Intimissimi — Conforto luxuoso", discount: 25 },
  ]},

  // ─── CALÇADOS / ESPORTES ─────────────────────────────
  { id: 51271, name: "Mizuno BR", logo: L(51271), offers: [
    { url: "https://www.mizuno.com.br/", title: "Mizuno — Tênis e Equipamentos Esportivos", discount: 30 },
    { url: "https://www.mizuno.com.br/tenis-de-corrida", title: "Tênis Mizuno Wave — Performance em corrida", discount: 30 },
    { url: "https://www.mizuno.com.br/tenis-feminino", title: "Tênis Mizuno Feminino — Conforto e estilo", discount: 25 },
  ]},
  { id: 79926, name: "Adidas BR", logo: L(79926), offers: [
    { url: "https://www.adidas.com.br/", title: "Adidas — Performance e estilo em esportes", discount: 30 },
    { url: "https://www.adidas.com.br/calcados", title: "Tênis Adidas — Originals, Running e Lifestyle", discount: 30 },
    { url: "https://www.adidas.com.br/roupas", title: "Roupas Adidas — Esportivas e Streetwear", discount: 25 },
    { url: "https://www.adidas.com.br/outlet", title: "Adidas Outlet — Até 50% OFF", discount: 50 },
  ]},
  { id: 17652, name: "Nike BR", logo: L(17652), offers: [
    { url: "https://www.nike.com.br", title: "Nike — Just Do It. Tênis e roupas esportivas", discount: 30 },
    { url: "https://www.nike.com.br/masculino/calcados", title: "Tênis Nike Air Max, Jordan e Dunk", discount: 30 },
    { url: "https://www.nike.com.br/feminino/calcados", title: "Tênis Nike Feminino — Estilo esportivo", discount: 30 },
    { url: "https://www.nike.com.br/promocoes", title: "Nike Outlet — Até 50% OFF", discount: 50 },
  ]},
  { id: 32675, name: "PUMA BR", logo: L(32675), offers: [
    { url: "https://br.puma.com/", title: "PUMA — Forever Faster. Tênis e roupas de treino", discount: 30 },
    { url: "https://br.puma.com/br/pt/collection/mens/shoes", title: "Tênis PUMA Masculino — RS-X, Suede, Speedcat", discount: 30 },
    { url: "https://br.puma.com/br/pt/collection/womens/shoes", title: "Tênis PUMA Feminino — Estilo e conforto", discount: 30 },
  ]},
  { id: 17698, name: "Olympikus BR", logo: L(17698), offers: [
    { url: "https://www.olympikus.com.br", title: "Olympikus — Tênis brasileiros de qualidade", discount: 30 },
    { url: "https://www.olympikus.com.br/masculino", title: "Tênis Olympikus Masculino — Corrida e casual", discount: 30 },
    { url: "https://www.olympikus.com.br/feminino", title: "Tênis Olympikus Feminino — Conforto ativo", discount: 30 },
  ]},
  { id: 28777, name: "Magic Feet BR", logo: L(28777), offers: [
    { url: "https://www.magicfeet.com.br/", title: "Magic Feet — Tênis das melhores marcas", discount: 25 },
    { url: "https://www.magicfeet.com.br/tenis", title: "Tênis multimarcas em promoção", discount: 30 },
  ]},

  // ─── PET ──────────────────────────────────────────────
  { id: 17870, name: "Cobasi BR", logo: L(17870), offers: [
    { url: "https://www.cobasi.com.br/", title: "Cobasi — Tudo pro seu pet com frete grátis", discount: 25 },
    { url: "https://www.cobasi.com.br/cachorros", title: "Cobasi Cães — Rações, petiscos e brinquedos", discount: 30 },
    { url: "https://www.cobasi.com.br/gatos", title: "Cobasi Gatos — Areias, rações premium e arranhadores", discount: 30 },
    { url: "https://www.cobasi.com.br/aquarismo", title: "Cobasi Aquarismo — Peixes e equipamentos", discount: 25 },
  ]},

  // ─── BELEZA ───────────────────────────────────────────
  { id: 125582, name: "Evas BR", logo: L(125582), offers: [
    { url: "https://www.evas.com.br/", title: "Evas Perfumaria — 28 anos de tradição em cosméticos", discount: 20 },
    { url: "https://www.evas.com.br/perfumes", title: "Perfumes Importados Evas — Givenchy, Paco Rabanne", discount: 25 },
    { url: "https://www.evas.com.br/maquiagem", title: "Maquiagem Evas — Marcas nacionais e importadas", discount: 20 },
  ]},
  { id: 17658, name: "Natura BR", logo: L(17658), offers: [
    { url: "https://www.natura.com.br/", title: "Natura — Beleza natural que faz bem à pele", discount: 30 },
    { url: "https://www.natura.com.br/perfumaria", title: "Perfumaria Natura — Kaiak, Ekos e Homem", discount: 30 },
    { url: "https://www.natura.com.br/tododia", title: "Linha Tododia — Hidratação e frescor diário", discount: 25 },
  ]},
  { id: 17891, name: "Loccitane en Provence BR", logo: L(17891), offers: [
    { url: "https://br.loccitane.com/", title: "L'Occitane — Beleza francesa de origem provençal", discount: 25 },
    { url: "https://br.loccitane.com/perfumes", title: "Perfumes L'Occitane — Fragrâncias marcantes", discount: 25 },
    { url: "https://br.loccitane.com/corpo", title: "Corpo L'Occitane — Cremes e hidratantes premium", discount: 25 },
  ]},

  // ─── ALIMENTOS / CAFÉ ────────────────────────────────
  { id: 19672, name: "Café L'or BR", logo: L(19672), offers: [
    { url: "https://www.cafelor.com.br/", title: "Café L'or — Cápsulas Espresso e Cafés Gourmet", discount: 15 },
    { url: "https://www.cafelor.com.br/capsulas-cafe", title: "Cápsulas de Café L'or — Sabores variados", discount: 20 },
  ]},
  { id: 75764, name: "Baggio Café BR", logo: L(75764), offers: [
    { url: "https://baggiocafe.com.br/", title: "Baggio Café — Cafés especiais brasileiros", discount: 20 },
    { url: "https://baggiocafe.com.br/capsulas", title: "Cápsulas Baggio — Compatíveis Nespresso e Dolce Gusto", discount: 25 },
  ]},

  // ─── BEBIDAS ──────────────────────────────────────────
  { id: 112634, name: "Zé Delivery BR", logo: L(112634), offers: [
    { url: "https://www.ze.delivery/", title: "Zé Delivery — Bebidas geladas entregues em minutos", discount: 15 },
  ]},

  // ─── ESPECIAIS ────────────────────────────────────────
  { id: 17729, name: "Kabum BR (geral)", logo: L(17729), offers: [
    { url: "https://www.kabum.com.br/ofertas", title: "Kabum — Ofertas do dia em tecnologia", discount: 30 },
    { url: "https://www.kabum.com.br/hardware", title: "Hardware Kabum — Placas de vídeo, processadores", discount: 25 },
    { url: "https://www.kabum.com.br/gamer", title: "Kabum Gamer — PCs, teclados, headsets", discount: 25 },
  ]},
  { id: 30599, name: "Stanley BR", logo: L(30599), offers: [
    { url: "https://www.stanley1913.com.br/", title: "Stanley — Garrafas térmicas premium até 30% OFF", discount: 30 },
    { url: "https://www.stanley1913.com.br/copos-canecas", title: "Copos e Canecas Stanley — Térmicos resistentes", discount: 25 },
    { url: "https://www.stanley1913.com.br/garrafas-termicas", title: "Garrafas Térmicas Stanley — 24h gelada/quente", discount: 20 },
  ]},
  { id: 106747, name: "Alianças Imperiais BR", logo: L(106747), offers: [
    { url: "https://www.aliancasimperiais.com.br/", title: "Alianças Imperiais — Casamento e Compromisso", discount: 15 },
    { url: "https://www.aliancasimperiais.com.br/aliancas", title: "Alianças de Moeda Antiga e Prata 4mm/6mm", discount: 20 },
  ]},
  { id: 127377, name: "VIVÃO - TELECOM BR", logo: L(127377), offers: [
    { url: "https://vivao.com.br/", title: "Vivão Telecom — Internet 500 Mega e 5G por R$ 89,90", discount: 20 },
  ]},

  // ─── VIAGENS ──────────────────────────────────────────
  { id: 32843, name: "GOL Linhas Aéreas", logo: L(32843), offers: [
    { url: "https://www.voegol.com.br/", title: "GOL — Passagens aéreas em promoção", discount: 25 },
    { url: "https://www.voegol.com.br/promocoes", title: "GOL Promoções — Voos a partir de R$ 99", discount: 40 },
  ]},
  { id: 119147, name: "Trip.com BR", logo: L(119147), offers: [
    { url: "https://br.trip.com", title: "Trip.com — Hotéis, voos e pacotes mundiais", discount: 30 },
    { url: "https://br.trip.com/hotels", title: "Hotéis Trip.com — Até 50% OFF em milhões de hotéis", discount: 50 },
    { url: "https://br.trip.com/flights", title: "Passagens Trip.com — Voos internacionais com desconto", discount: 30 },
  ]},
  { id: 17817, name: "Quero Passagem BR", logo: L(17817), offers: [
    { url: "http://queropassagem.com.br/", title: "Quero Passagem — Passagens aéreas com desconto", discount: 30 },
  ]},
  { id: 24143, name: "Allianz Travel BR", logo: L(24143), offers: [
    { url: "https://www.allianztravel.com.br/", title: "Allianz Travel — Seguro viagem com cobertura mundial", discount: 20 },
  ]},

  // ─── BRINQUEDOS ───────────────────────────────────────
  { id: 30511, name: "Lego BR", logo: L(30511), offers: [
    { url: "https://www.lego.com.br/", title: "LEGO — Sets clássicos e novidades", discount: 25 },
    { url: "https://www.lego.com.br/categories/promotions", title: "LEGO Promoções — Star Wars, Technic e Harry Potter", discount: 30 },
    { url: "https://www.lego.com.br/categories/adults-welcome", title: "LEGO Adults Welcome — Sets desafiadores", discount: 20 },
  ]},

  // ─── FERRAMENTAS ──────────────────────────────────────
  { id: 64654, name: "Ferramentas Kennedy BR", logo: L(64654), offers: [
    { url: "https://www.ferramentaskennedy.com.br/", title: "Ferramentas Kennedy — Para profissional e DIY", discount: 25 },
  ]},

  // ─── ACESSÓRIOS ───────────────────────────────────────
  { id: 17814, name: "Gocase BR", logo: L(17814), offers: [
    { url: "https://www.gocase.com.br/", title: "Gocase — Capas de celular com designs exclusivos", discount: 30 },
    { url: "https://www.gocase.com.br/capinhas", title: "Capinhas Personalizadas — iPhone e Samsung", discount: 30 },
  ]},

  // ─── HOSPEDAGEM ───────────────────────────────────────
  { id: 117371, name: "Hostinger BR", logo: L(117371), offers: [
    { url: "https://www.hostinger.com.br/", title: "Hostinger — Hospedagem de sites super rápida", discount: 75 },
    { url: "https://www.hostinger.com.br/hospedagem-de-sites", title: "Hospedagem WordPress — Até 75% OFF + domínio grátis", discount: 75 },
  ]},

  // ─── INTERNACIONAL ────────────────────────────────────
  { id: 114336, name: "House-of-Sneakers DE", logo: L(114336), offers: [
    { url: "https://house-of-sneakers.de/", title: "House of Sneakers DE — Tênis exclusivos europeus", discount: 20 },
  ]},
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
