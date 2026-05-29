import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function ok(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const auth   = req.headers.get("authorization") ?? "";
  const S = process.env.SYNC_SECRET ?? "";
  const C = process.env.CRON_SECRET ?? "";
  return secret === S || auth === `Bearer ${S}` || auth === `Bearer ${C}`;
}

type Coupon = {
  id: string;
  code: string | null;
  description: string;
  discount_type: string;
  discount_value: number | null;
  affiliate_url: string;
  expires_at: string | null;
  store_name: string;
};

function format(c: Coupon): string {
  const store = c.store_name.toUpperCase();
  const discount =
    c.discount_type === "percent"       && c.discount_value ? `💰 <b>${c.discount_value}% OFF</b>` :
    c.discount_type === "fixed"         && c.discount_value ? `💰 <b>R$${c.discount_value} de desconto</b>` :
    c.discount_type === "free_shipping"                     ? `🚚 <b>FRETE GRÁTIS</b>` :
    `🏷️ <b>Promoção especial</b>`;

  const code   = c.code ? `\n🎫 Código: <code>${c.code}</code>` : `\n✅ Desconto automático`;
  const expiry = c.expires_at ? `\n⏰ Válido até ${new Date(c.expires_at).toLocaleDateString("pt-BR")}` : "";
  const desc   = c.description.slice(0, 100);

  return (
    `🏷️ <b>${store}</b>\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `${discount}\n` +
    `📌 ${desc}` + code + expiry +
    `\n\n🛒 <a href="${c.affiliate_url}">Aproveitar oferta →</a>\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `📲 @cupomhojeoficial`
  );
}

async function send(text: string, token: string, chatId: string) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: false }),
  });
  const data = await r.json() as { ok: boolean; description?: string; result?: { message_id: number } };
  if (!data.ok) throw new Error(`Telegram: ${data.description}`);
  return data.result?.message_id;
}

export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Valida env vars
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)  missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.TELEGRAM_BOT_TOKEN)        missing.push("TELEGRAM_BOT_TOKEN");

  if (missing.length > 0)
    return NextResponse.json({ error: "Variáveis faltando no Vercel", missing }, { status: 500 });

  try {
    const TOKEN   = process.env.TELEGRAM_BOT_TOKEN!;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "@cupomhojeoficial";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("coupons_with_store")
      .select("id, code, description, discount_type, discount_value, affiliate_url, expires_at, store_name")
      .eq("is_active", true)
      .order("discount_value", { ascending: false })
      .order("created_at",     { ascending: false })
      .limit(3);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0)
      return NextResponse.json({ ok: false, msg: "Nenhum cupom ativo. Rode /api/sync primeiro." });

    const results = [];
    for (const coupon of data as Coupon[]) {
      try {
        const msgId = await send(format(coupon), TOKEN, CHAT_ID);
        results.push({ id: coupon.id, ok: true, message_id: msgId });
      } catch (e) {
        results.push({ id: coupon.id, ok: false, error: String(e) });
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    return NextResponse.json({ ok: true, posted: results.filter(r => r.ok).length, total: data.length, results, ts: new Date().toISOString() });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
