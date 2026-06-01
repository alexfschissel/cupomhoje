/**
 * GET /api/setup-community?secret=XXX
 * Configura a comunidade @cupomhojecomunidade:
 * 1. Atualiza descrição
 * 2. Envia mensagem de boas-vindas com regras
 * 3. Fixa a mensagem
 */

import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S;
}

const COMMUNITY_CHAT_ID = "@cupomhojecomunidade";

const DESCRIPTION = "💬 Comunidade do CupomHoje — Compartilhe ofertas, tire dúvidas e converse com quem economiza | Canal oficial: @cupomhojeoficial";

const WELCOME_MESSAGE = `💬 <b>BEM-VINDO À COMUNIDADE!</b>

Espaço pra quem ama economizar 🏷

━━━━━━━━━━━━━━━━━━━━━

📌 <b>O QUE ROLA AQUI</b>

✅ Compartilhe ofertas que encontrar
✅ Tire dúvidas antes de comprar
✅ Indique cupons exclusivos
✅ Avalie produtos que comprou
✅ Converse com a galera

━━━━━━━━━━━━━━━━━━━━━

🚫 <b>REGRAS</b>

❌ Sem spam ou divulgação de canais
❌ Sem links de afiliados próprios
❌ Sem brigas ou ofensas
❌ Sem conteúdo adulto/político
✅ Respeito sempre

━━━━━━━━━━━━━━━━━━━━━

📲 <b>CANAL PRINCIPAL</b>

👉 @cupomhojeoficial
Ofertas a cada 15 min com cupom aplicado

━━━━━━━━━━━━━━━━━━━━━

🚀 <b>Bem-vindo! Boas economias!</b>`;

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN não configurado" }, { status: 500 });

  const results: Record<string, unknown> = {};

  try {
    // 1. Descrição
    const descRes = await fetch(`https://api.telegram.org/bot${TOKEN}/setChatDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: COMMUNITY_CHAT_ID, description: DESCRIPTION }),
    });
    const descData = await descRes.json() as { ok: boolean; description?: string };
    results.description = descData.ok ? "ok" : `error: ${descData.description}`;

    // 2. Mensagem de boas-vindas
    const msgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: COMMUNITY_CHAT_ID,
        text: WELCOME_MESSAGE,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const msgData = await msgRes.json() as { ok: boolean; description?: string; result?: { message_id: number } };
    if (!msgData.ok) {
      return NextResponse.json({
        ok: false,
        error: `Falha ao enviar: ${msgData.description}`,
        results,
      }, { status: 500 });
    }

    const messageId = msgData.result?.message_id;
    results.welcome_message = { sent: true, message_id: messageId };

    // 3. Pinned
    if (messageId) {
      const pinRes = await fetch(`https://api.telegram.org/bot${TOKEN}/pinChatMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: COMMUNITY_CHAT_ID,
          message_id: messageId,
          disable_notification: false,
        }),
      });
      const pinData = await pinRes.json() as { ok: boolean; description?: string };
      results.pinned = pinData.ok ? "ok" : `error: ${pinData.description}`;
    }

    return NextResponse.json({ ok: true, results, ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), results }, { status: 500 });
  }
}
