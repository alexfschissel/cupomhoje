/**
 * GET /api/setup-channel?secret=XXX
 * Configura o canal @cupomhojeoficial:
 * 1. Atualiza descrição do canal
 * 2. Envia mensagem de boas-vindas
 * 3. Fixa (pin) a mensagem
 *
 * Rodar 1x apenas (ou quando quiser atualizar a mensagem fixada).
 */

import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S;
}

const CHANNEL_DESCRIPTION = "🏷 Cupons e descontos a cada 15 min | Amazon, AliExpress, Shopee, LG, Stanley e mais | 100% grátis";

const WELCOME_MESSAGE = `🎉 <b>BEM-VINDO AO CUPOMHOJE!</b>

🏷 O canal nº 1 de cupons e descontos do Brasil

━━━━━━━━━━━━━━━━━━━━━

📌 <b>COMO FUNCIONA</b>

✅ Postamos uma nova oferta a cada <b>15 minutos</b>
✅ Cupons e descontos de até <b>80% OFF</b>
✅ Link direto para a loja (com cupom aplicado)
✅ 100% grátis | Sem cadastro | Sem spam

━━━━━━━━━━━━━━━━━━━━━

🛍 <b>LOJAS PARCEIRAS</b>

🛒 Amazon | AliExpress | Shopee
📺 LG | Stanley | Panasonic | Arno
👕 Lacoste | Renner | Dafiti | Havaianas
💄 Natura | Evas | Vivara
🍺 Zé Delivery | Café L'or
✈️ Decolar | Booking
₿ Binance | Bybit | Ledger
+ muitas outras

━━━━━━━━━━━━━━━━━━━━━

💡 <b>COMO USAR</b>

1️⃣ Quando uma oferta te interessar, toque em <b>"COMPRAR AGORA"</b>
2️⃣ O cupom é aplicado automaticamente
3️⃣ Finalize sua compra com o desconto ✅

━━━━━━━━━━━━━━━━━━━━━

🔔 <b>ATIVE AS NOTIFICAÇÕES</b>

Para não perder nenhuma oferta:
📱 Toque no nome do canal no topo
🔔 Ative as notificações

━━━━━━━━━━━━━━━━━━━━━

💬 <b>NOSSA COMUNIDADE</b>

👉 @cupomhojecomunidade
Compartilhe dicas de economia e tire dúvidas

━━━━━━━━━━━━━━━━━━━━━

⚠️ <i>Aviso: somos afiliados das lojas parceiras. Preços e disponibilidade podem variar.</i>

🚀 <b>Bons descontos!</b>`;

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "@cupomhojeoficial";

  if (!TOKEN) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN não configurado" }, { status: 500 });

  const results: Record<string, unknown> = {};

  try {
    // 1. Atualiza descrição do canal
    const descRes = await fetch(`https://api.telegram.org/bot${TOKEN}/setChatDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        description: CHANNEL_DESCRIPTION,
      }),
    });
    const descData = await descRes.json() as { ok: boolean; description?: string; result?: unknown };
    results.description = descData.ok ? "ok" : `error: ${descData.description}`;

    // 2. Envia mensagem de boas-vindas
    const msgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: WELCOME_MESSAGE,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const msgData = await msgRes.json() as { ok: boolean; description?: string; result?: { message_id: number } };
    if (!msgData.ok) {
      return NextResponse.json({
        ok: false,
        error: `Falha ao enviar mensagem: ${msgData.description}`,
        results,
      }, { status: 500 });
    }

    const messageId = msgData.result?.message_id;
    results.welcome_message = { sent: true, message_id: messageId };

    // 3. Fixa a mensagem
    if (messageId) {
      const pinRes = await fetch(`https://api.telegram.org/bot${TOKEN}/pinChatMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          message_id: messageId,
          disable_notification: false,
        }),
      });
      const pinData = await pinRes.json() as { ok: boolean; description?: string };
      results.pinned = pinData.ok ? "ok" : `error: ${pinData.description}`;
    }

    return NextResponse.json({
      ok: true,
      results,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: String(e),
      results,
    }, { status: 500 });
  }
}
