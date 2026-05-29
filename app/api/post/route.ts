import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function ok(req: NextRequest) {
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

const SEP = "━━━━━━━━━━━━━━━━";

// Escapa & para HTML válido no href
function safeUrl(url: string) {
  return url.replace(/&/g, "&amp;");
}

// ── Formata mensagem no padrão canal de promoções ─────────────────────────────
function format(c: Coupon): string {
  const store = c.store_name.toUpperCase();
  const desc  = c.description.trim();
  const lines: string[] = [];

  // Label de desconto
  const discountLabel =
    c.discount_type === "percent"      && c.discount_value ? `${c.discount_value}% OFF` :
    c.discount_type === "fixed"        && c.discount_value ? `R$${c.discount_value} de desconto` :
    c.discount_type === "free_shipping"                    ? "Frete Grátis" : "Promoção especial";

  // CTA principal
  const cta =
    store.includes("ALIEXPRESS") ? "COMPRAR NO ALIEXPRESS" :
    store.includes("AMAZON")     ? "COMPRAR NA AMAZON"     :
    c.code                       ? "COMPRAR AGORA"         : "ACESSAR AGORA";

  lines.push(`🏷 <b>${store}</b>`);
  lines.push(SEP);
  lines.push(`🏷 ${discountLabel}`);
  lines.push(`🛒 ${desc.slice(0, 150)}`);

  if (c.discount_value && c.discount_value > 0)
    lines.push(`💰 ${c.discount_value}% de desconto`);

  if (c.code)
    lines.push(`☝️ Cupom: <code>${c.code}</code>`);
  else
    lines.push(`✅ Desconto automático`);

  if (c.expires_at)
    lines.push(`⏰ Válido até ${new Date(c.expires_at).toLocaleDateString("pt-BR")}`);

  lines.push("");
  lines.push(`🛒 <a href="${safeUrl(c.affiliate_url)}">${cta}</a>`);
  lines.push(SEP);
  lines.push("📲 @cupomhojeoficial");

  return lines.join("\n");
}

async function send(text: string, token: string, chatId: string) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await r.json() as { ok: boolean; description?: string; result?: { message_id: number } };
  if (!data.ok) throw new Error(`Telegram: ${data.description}`);
  return data.result?.message_id;
}

export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)  missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.TELEGRAM_BOT_TOKEN)        missing.push("TELEGRAM_BOT_TOKEN");
  if (missing.length > 0)
    return NextResponse.json({ error: "Variáveis faltando", missing }, { status: 500 });

  // Quantos posts por chamada (padrão 5, pode passar ?limit=N)
  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") ?? "5");
  const limit = Math.min(Math.max(limitParam, 1), 10);

  try {
    const TOKEN   = process.env.TELEGRAM_BOT_TOKEN!;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "@cupomhojeoficial";
    const supabase = db();

    // Busca pool maior e escolhe aleatoriamente para variar os posts
    let { data, error } = await supabase
      .from("coupons_with_store")
      .select("id, code, description, discount_type, discount_value, affiliate_url, expires_at, store_name")
      .eq("is_active", true)
      .order("discount_value", { ascending: false })
      .limit(30);

    if (error) {
      try {
        const r2 = await supabase
          .from("coupons_with_store")
          .select("id, code, description, discount_type, discount_value, affiliate_url, expires_at, store_name")
          .eq("is_active", true)
          .limit(30);
        data  = r2.data;
        error = r2.error;
      } catch (e) {
        return NextResponse.json({ error: "Supabase falhou", detail: String(e) }, { status: 500 });
      }
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0)
      return NextResponse.json({ ok: false, msg: "Nenhum cupom ativo. Rode /api/sync primeiro." });

    // Embaralha e pega os primeiros N
    const shuffled = (data as Coupon[]).sort(() => Math.random() - 0.5).slice(0, limit);

    const results = [];
    for (const coupon of shuffled) {
      try {
        const msgId = await send(format(coupon), TOKEN, CHAT_ID);
        results.push({ id: coupon.id, store: coupon.store_name, ok: true, message_id: msgId });
      } catch (e) {
        results.push({ id: coupon.id, store: coupon.store_name, ok: false, error: String(e) });
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    return NextResponse.json({
      ok:     true,
      posted: results.filter(r => r.ok).length,
      total:  shuffled.length,
      results,
      ts:     new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
