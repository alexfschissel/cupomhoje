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
  image_url: string | null;
};

const SEP = "━━━━━━━━━━━━━━━━";

function safeUrl(url: string) {
  return url.replace(/&/g, "&amp;");
}

// ── Formata mensagem ──────────────────────────────────────────────────────────
function format(c: Coupon): string {
  const store = c.store_name.toUpperCase();
  const desc  = c.description.trim();
  const lines: string[] = [];

  // Detecta "De R$ORIG por R$SALE — Nome" (desconto real, orig > sale)
  const priceMatch = desc.match(/^De R\$(\S+) por R\$(\S+) — (.+)$/i);
  const origNum = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0;
  const saleNum = priceMatch ? parseFloat(priceMatch[2].replace(",", ".")) : 0;
  const hasDiscount = origNum > 0 && saleNum > 0 && origNum > saleNum; // preços DIFERENTES

  // Detecta "R$PRICE — Nome" (preço atual sem comparação — LG BR)
  const priceOnlyMatch = !priceMatch ? desc.match(/^R\$(\S+) — (.+)$/i) : null;

  // Label de desconto
  const discountLabel =
    c.discount_type === "percent" && c.discount_value && c.discount_value > 0
      ? `${Math.round(c.discount_value)}% OFF`
      : c.discount_type === "fixed" && c.discount_value && c.discount_value > 0
      ? `R$${c.discount_value} de desconto`
      : c.discount_type === "free_shipping"
      ? "Frete Grátis"
      : hasDiscount
      ? `${Math.round(((origNum - saleNum) / origNum) * 100)}% OFF`
      : "Promoção especial";

  // CTA baseado na loja
  const cta =
    store.includes("ALIEXPRESS") ? "COMPRAR NO ALIEXPRESS" :
    store.includes("AMAZON")     ? "COMPRAR NA AMAZON"     :
    store.includes("LG")         ? "COMPRAR NA LG"         :
    store.includes("STANLEY")    ? "COMPRAR NA STANLEY"    :
    store.includes("ARNO")       ? "COMPRAR NA ARNO"       :
    c.code                       ? "COMPRAR AGORA"         :
                                   "ACESSAR AGORA";

  lines.push(`🏷 <b>${store}</b>`);
  lines.push(SEP);
  lines.push(`🏷 ${discountLabel}`);

  if (hasDiscount && priceMatch) {
    // Tem desconto real — mostra comparação de preços
    lines.push(`💲 De R$${priceMatch[1]} por R$${priceMatch[2]}`);
    lines.push(`🛒 ${priceMatch[3].slice(0, 100)}`);
  } else if (priceMatch) {
    // Preços iguais — mostra só o nome, sem comparação
    lines.push(`🛒 ${priceMatch[3].slice(0, 100)}`);
  } else if (priceOnlyMatch) {
    // Só preço atual (LG BR sem rrp) — mostra preço e nome
    lines.push(`💲 R$${priceOnlyMatch[1]}`);
    lines.push(`🛒 ${priceOnlyMatch[2].slice(0, 100)}`);
  } else {
    lines.push(`🛒 ${desc.slice(0, 100)}`);
  }

  if (c.discount_value && c.discount_value > 0)
    lines.push(`💰 ${Math.round(c.discount_value)}% de desconto`);
  else if (hasDiscount)
    lines.push(`💰 ${Math.round(((origNum - saleNum) / origNum) * 100)}% de desconto`);

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

// ── Telegram API ──────────────────────────────────────────────────────────────
// Link preview automático — Telegram puxa a imagem do link (igual ao Ledger)
async function sendMessage(text: string, token: string, chatId: string) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,  // preview automático do link
    }),
  });
  const d = await r.json() as { ok: boolean; description?: string; result?: { message_id: number } };
  if (!d.ok) throw new Error(`sendMessage: ${d.description}`);
  return d.result?.message_id;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)  missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.TELEGRAM_BOT_TOKEN)        missing.push("TELEGRAM_BOT_TOKEN");
  if (missing.length > 0)
    return NextResponse.json({ error: "Variáveis faltando", missing }, { status: 500 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "5"), 10);

  try {
    const TOKEN   = process.env.TELEGRAM_BOT_TOKEN!;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "@cupomhojeoficial";
    const supabase = db();

    // Busca todos os produtos — sem ordenação para garantir variedade entre lojas
    const { data, error } = await supabase
      .from("coupons_with_store")
      .select("id, code, description, discount_type, discount_value, affiliate_url, expires_at, store_name, image_url")
      .eq("is_active", true)
      .limit(300);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0)
      return NextResponse.json({ ok: false, msg: "Nenhum cupom ativo. Rode /api/sync primeiro." });

    // Round-robin por loja — garante variedade (Amazon, AliExpress, LG, etc.)
    const byStore: Record<string, Coupon[]> = {};
    for (const c of data as Coupon[]) {
      if (!byStore[c.store_name]) byStore[c.store_name] = [];
      byStore[c.store_name].push(c);
    }
    // Embaralha dentro de cada loja
    for (const k of Object.keys(byStore)) byStore[k].sort(() => Math.random() - 0.5);
    // Round-robin: 1 de cada loja por rodada
    const storeKeys = Object.keys(byStore).sort(() => Math.random() - 0.5);
    const shuffled: Coupon[] = [];
    let round = 0;
    while (shuffled.length < limit) {
      let added = 0;
      for (const k of storeKeys) {
        if (shuffled.length >= limit) break;
        if (byStore[k].length > round) { shuffled.push(byStore[k][round]); added++; }
      }
      if (added === 0) break;
      round++;
    }

    const results = [];
    for (const coupon of shuffled) {
      try {
        const text   = format(coupon);
        let msgId: number | undefined;

        // Sempre usa sendMessage — Telegram puxa preview automático do link
        msgId = await sendMessage(text, TOKEN, CHAT_ID);

        results.push({ id: coupon.id, store: coupon.store_name, ok: true, message_id: msgId, has_image: !!coupon.image_url });
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
