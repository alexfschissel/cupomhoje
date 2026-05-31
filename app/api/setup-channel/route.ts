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

const WELCOME_MESSAGE = `🔥 <b>CUPONS E DESCONTOS · 24h POR DIA</b>

✅ Amazon, AliExpress, Shopee
✅ LG, Stanley, Lacoste, Natura
✅ Até <b>80% OFF</b> | Nova oferta a cada 15 min
✅ 100% grátis · Sem spam

🔔 <b>Ative as notificações</b> ↑ pra não perder
💬 Comunidade: @cupomhojecomunidade`;

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
