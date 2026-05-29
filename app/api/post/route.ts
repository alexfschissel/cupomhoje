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

// ── Formata mensagem — padrão premium (imagem 4) ──────────────────────────────
function format(c: Coupon): string {
  const store = c.store_name.toUpperCase();
  const desc  = c.description.trim();
  const lines: string[] = [];

  // Detecta "De R$ORIG por R$SALE — Nome"
  const priceMatch = desc.match(/^De R\$(\S+) por R\$(\S+) — (.+)$/i);
  const origNum = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0;
  const saleNum = priceMatch ? parseFloat(priceMatch[2].replace(",", ".")) : 0;

  const productName = priceMatch ? priceMatch[3] : desc;
  const discountPct = c.discount_value && c.discount_value > 0 ? Math.round(c.discount_value) : null;

  // CTA baseado na loja
  const cta =
    store.includes("ALIEXPRESS") ? "COMPRAR NO ALIEXPRESS" :
    store.includes("AMAZON")     ? "COMPRAR NA AMAZON"     :
    store.includes("MERCADO")    ? "COMPRAR NO ML"         :
    store.includes("LG")         ? "COMPRAR NA LG"         :
    store.includes("STANLEY")    ? "COMPRAR NA STANLEY"    :
    c.code                       ? "COMPRAR AGORA"         :
                                   "ACESSAR AGORA";

  // Layout premium (padrão imagem 4)
  lines.push(`📦 ${store}`);

  if (discountPct) {
    lines.push(`🏷 <b>${discountPct}% OFF</b>`);
  }

  if (origNum > 0 && saleNum > 0 && origNum > saleNum) {
    lines.push(`De <s>R$${Math.round(origNum)}</s> por <b>R$${Math.round(saleNum)}</b>`);
  } else if (saleNum > 0) {
    lines.push(`<b>R$${Math.round(saleNum)}</b>`);
  }

  lines.push(`${productName.slice(0, 100)}`);

  if (c.code) {
    lines.push(`\n💳 Cupom: <code>${c.code}</code>`);
  } else {
    lines.push(`✅ Desconto automático`);
  }

  lines.push(`\n<a href="${safeUrl(c.affiliate_url)}">${cta}</a>`);
  lines.push(`@cupomhojeoficial`);

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

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "5"), 50);

  try {
    const TOKEN   = process.env.TELEGRAM_BOT_TOKEN!;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "@cupomhojeoficial";
    const supabase = db();

    // Busca produtos com desconto real nos últimos 2h não foram postados
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const { data, error } = await supabase
      .from("coupons_with_store")
      .select("id, code, description, discount_type, discount_value, affiliate_url, expires_at, store_name, image_url, last_posted_at")
      .eq("is_active", true)
      .gt("discount_value", 0) // Só produtos com desconto > 0
      .or(`last_posted_at.is.null,last_posted_at.lt.${twoHoursAgo.toISOString()}`) // Não postado ou postado há mais de 2h
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
    const now = new Date().toISOString();

    for (const coupon of shuffled) {
      try {
        const text   = format(coupon);
        let msgId: number | undefined;

        // Sempre usa sendMessage — Telegram puxa preview automático do link
        msgId = await sendMessage(text, TOKEN, CHAT_ID);

        // Atualiza último post do produto (para não repetir em 2h)
        await supabase
          .from("coupons")
          .update({ last_posted_at: now })
          .eq("id", coupon.id);

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
