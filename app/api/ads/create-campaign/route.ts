/**
 * POST /api/ads/create-campaign?secret=XXX
 * Body (JSON):
 * {
 *   "name": "CupomHoje - Telegram - Teste 4",
 *   "daily_budget_brl": 10,
 *   "image_url": "https://cupomhoje.vercel.app/anuncio-laranja.png",
 *   "message_text": "Cansado de pagar preço cheio? 😤...",
 *   "preset": "B"  // opcional: A, B, C, D — usa um dos textos prontos
 * }
 *
 * Cria Campaign + AdSet + Creative + Ad TODOS PAUSADOS.
 * Você revisa e ativa pelo dashboard /admin/ads.
 *
 * GET /api/ads/create-campaign?secret=XXX&preset=B&name=Teste4&budget=10
 *   → cria com defaults pra teste rápido
 */

import { MetaAPI } from "@/lib/meta-api";
import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S;
}

const PRESETS = {
  A: {
    name: "Padrão",
    message: `Cansado de pagar preço cheio? 😤

No nosso canal do Telegram você recebe CUPONS GRATUITOS das maiores lojas:

✅ Amazon (até 60% OFF)
✅ AliExpress (até 80% OFF)
✅ Shopee, Mercado Livre, LG, Kabum
✅ 200+ ofertas todos os dias

🔔 Nova oferta a cada 15 minutos
💰 100% grátis, sem spam, sem cadastro

👇 Entre AGORA, é só 1 clique:`,
    headline: "Até 80% OFF no Telegram 🔥",
    description: "Amazon, AliExpress e Shopee — nova oferta a cada 15 min",
  },
  B: {
    name: "Emocional",
    message: `Você sabia que tá pagando CARO DEMAIS? 💸

Eu mesma pagava o preço cheio toda vez... até descobrir esses cupons.

Agora eu economizo TODA semana comprando:

🔥 Eletrônicos com 60% OFF na Amazon
🔥 Roupas com 40% OFF no Lacoste
🔥 Eletrodomésticos com 30% OFF na Panasonic
🔥 Mais de 200 ofertas TODO DIA

📲 Funciona assim:
1️⃣ Entra no canal grátis
2️⃣ Recebe oferta a cada 15 min
3️⃣ Compra com cupom já aplicado

⏰ Quem entra HOJE já economiza HOJE.

👇 Toca aqui e nunca mais pague o preço cheio:`,
    headline: "PAREI de pagar preço cheio 💰",
    description: "Cupons de 30 a 80% OFF | Amazon, Shopee, Kabum, LG no Telegram",
  },
  C: {
    name: "FOMO/Prova social",
    message: `🚨 LANÇAMENTO: Canal de cupons EXCLUSIVO

Estamos selecionando os primeiros 1.000 membros do canal mais novo de cupons do Brasil 🇧🇷

Membros fundadores ganham:
✅ Acesso antecipado às ofertas
✅ Cupons EXCLUSIVOS de Amazon, AliExpress, Shopee
✅ Nova oferta a cada 15 minutos
✅ 100% grátis pra sempre

Lojas parceiras:
🛒 Amazon, AliExpress, Shopee, Kabum
📺 LG, Panasonic, Stanley, Lacoste
💄 Natura, Evas, Adidas, Mizuno

🎁 Quem entra HOJE pega as ofertas de hoje.

👇 Garanta sua vaga (limite de 1.000):`,
    headline: "Vagas LIMITADAS — Canal exclusivo 🎁",
    description: "Membros fundadores ganham acesso antecipado a 200+ cupons/dia",
  },
  D: {
    name: "Direto/Simples",
    message: `🏷 Cupons das maiores lojas do Brasil

✅ Amazon
✅ AliExpress
✅ Shopee
✅ Mercado Livre
✅ LG, Kabum, Panasonic
✅ Lacoste, Natura, Renner

📲 Nova oferta a cada 15 minutos no Telegram
💰 Até 80% de desconto
🎁 100% grátis

👇 Entre agora:`,
    headline: "Cupons grátis no Telegram 🏷",
    description: "Amazon, Shopee, Kabum até 80% OFF — sem cadastro",
  },
};

async function handle(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse body OR query string
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    body = await req.json().catch(() => ({}));
  }

  const url = req.nextUrl;
  const preset = (body.preset as string) ?? url.searchParams.get("preset") ?? "B";
  const presetData = PRESETS[preset as keyof typeof PRESETS] ?? PRESETS.B;

  const name = (body.name as string) ?? url.searchParams.get("name") ?? `CupomHoje - Telegram - Auto ${new Date().toISOString().slice(5, 10)}`;
  const dailyBudgetBRL = parseFloat(
    String(body.daily_budget_brl ?? url.searchParams.get("budget") ?? "10")
  );
  const targetUrl = (body.target_url as string) ?? url.searchParams.get("target_url") ?? "https://t.me/cupomhojeoficial";
  const imageUrl = (body.image_url as string) ?? url.searchParams.get("image_url") ?? "";
  const messageText = (body.message_text as string) ?? presetData.message;
  const headlineText = (body.headline as string) ?? presetData.headline;
  const descriptionText = (body.description as string) ?? presetData.description;

  const meta = new MetaAPI();
  if (!meta.isConfigured()) {
    return NextResponse.json({ error: "Meta API não configurada" }, { status: 500 });
  }

  try {
    // Se passou image_url, sobe a imagem primeiro
    let imageHash: string | undefined;
    if (imageUrl) {
      const hash = await meta.uploadImageFromUrl(imageUrl);
      if (hash) imageHash = hash;
    }

    const result = await meta.createFullCampaign({
      name,
      dailyBudgetBRL,
      targetUrl,
      imageHash,
      imageUrl: imageHash ? undefined : imageUrl, // só passa URL se upload falhou
      messageText,
      headlineText,
      descriptionText,
      ctaType: "SIGN_UP",
      ageMin: 22,
      ageMax: 45,
    });

    return NextResponse.json({
      ok: !result.error,
      preset_used: preset,
      preset_name: presetData.name,
      ...result,
      next_step: result.error ? null : "Vá em /admin/ads e ative a campanha quando estiver pronto",
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
