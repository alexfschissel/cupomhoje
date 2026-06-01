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
  last_posted_at: string | null;
};

const SEP = "━━━━━━━━━━━━━━━━";

function safeUrl(url: string) {
  return url.replace(/&/g, "&amp;");
}

// ── Formata mensagem — template profissional ─────────────────────────────────
function format(c: Coupon): string {
  const store = c.store_name;
  const desc  = c.description.trim();
  const lines: string[] = [];

  // Detecta "De R$ORIG por R$SALE — Nome" ou "R$X — Nome"
  const priceMatch = desc.match(/^De R\$(\S+) por R\$(\S+) — (.+)$/i);
  const simpleMatch = desc.match(/^R\$(\S+) — (.+)$/i);

  const origNum = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0;
  const saleNum = priceMatch
    ? parseFloat(priceMatch[2].replace(",", "."))
    : simpleMatch
    ? parseFloat(simpleMatch[1].replace(",", "."))
    : 0;

  const productName = priceMatch
    ? priceMatch[3]
    : simpleMatch
    ? simpleMatch[2]
    : desc;

  // Capitaliza e limpa o nome
  const cleanName = productName
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  const discountPct = c.discount_value && c.discount_value > 0 ? Math.round(c.discount_value) : 0;

  // ═══ TÍTULO COM EMOJI ATRATIVO ═══
  // Header chamativo baseado no desconto
  if (discountPct >= 50) {
    lines.push(`🔥 <b>MEGA OFERTA — ${discountPct}% OFF</b> 🔥`);
  } else if (discountPct >= 30) {
    lines.push(`⚡ <b>${discountPct}% DE DESCONTO</b> ⚡`);
  } else if (discountPct > 0) {
    lines.push(`🏷 <b>${discountPct}% OFF</b>`);
  } else {
    lines.push(`🛍 <b>OFERTA ESPECIAL</b>`);
  }

  lines.push("");

  // ═══ NOME DO PRODUTO ═══
  lines.push(`📦 <b>${cleanName}</b>`);
  lines.push("");

  // ═══ PREÇO ═══
  if (origNum > 0 && saleNum > 0 && origNum > saleNum) {
    lines.push(`💸 <s>De R$ ${origNum.toFixed(2).replace(".", ",")}</s>`);
    lines.push(`💰 <b>Por R$ ${saleNum.toFixed(2).replace(".", ",")}</b>`);
  } else if (saleNum > 0) {
    lines.push(`💰 <b>R$ ${saleNum.toFixed(2).replace(".", ",")}</b>`);
  }

  lines.push("");

  // ═══ CUPOM / DESCONTO AUTOMÁTICO ═══
  if (c.code) {
    lines.push(`🎟 Cupom: <code>${c.code}</code>`);
  } else {
    lines.push(`✅ <i>Desconto aplicado automaticamente</i>`);
  }

  lines.push("");

  // ═══ CTA ═══
  lines.push(`🛒 <a href="${safeUrl(c.affiliate_url)}"><b>COMPRAR AGORA →</b></a>`);
  lines.push("");

  // ═══ RODAPÉ ═══
  lines.push(SEP);
  lines.push(`🏪 <i>${store}</i> | 📲 @cupomhojeoficial`);

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

    // POLÍTICA DE COOLDOWN — sem repetir produtos até o ciclo completo
    // - Padrão: 48 horas (2 dias) — temos 2.600+ produtos NULL, ciclo demora ~32h
    // - Lojas pequenas (Wise, Nubank): 7 dias (168h)
    // Resultado: cada produto aparece no máximo 1x a cada 2 dias
    const COOLDOWN_HOURS_DEFAULT = 48;
    const COOLDOWN_HOURS_SMALL = 168;

    const cooldownDefault = new Date();
    cooldownDefault.setHours(cooldownDefault.getHours() - COOLDOWN_HOURS_DEFAULT);
    const fourHoursAgo = cooldownDefault; // mantém nome da variável para não quebrar

    // Busca direto da tabela coupons com JOIN em stores (view não tem last_posted_at)
    // IMPORTANTE: order by last_posted_at NULLS FIRST → produtos NUNCA postados vêm primeiro
    // Limit aumentado pra 1500 → garante representação de TODAS as lojas
    const { data: rawData, error } = await supabase
      .from("coupons")
      .select(`
        id, code, description, discount_type, discount_value,
        affiliate_url, expires_at, image_url, last_posted_at,
        stores ( name )
      `)
      .eq("is_active", true)
      .gt("discount_value", 0)
      .or(`last_posted_at.is.null,last_posted_at.lt.${fourHoursAgo.toISOString()}`)
      .order("last_posted_at", { ascending: true, nullsFirst: true })
      .limit(1500);

    // Helper: extrai store name — Supabase JOIN às vezes retorna array, às vezes objeto
    const extractStoreName = (stores: unknown): string => {
      if (!stores) return "Loja";
      if (Array.isArray(stores)) {
        const first = stores[0] as { name?: string } | undefined;
        return first?.name ?? "Loja";
      }
      return (stores as { name?: string }).name ?? "Loja";
    };

    // Achata a estrutura: stores.name → store_name
    const data: Coupon[] | null = rawData
      ? (rawData as Array<Record<string, unknown>>).map(r => ({
          id: r.id as string,
          code: r.code as string | null,
          description: r.description as string,
          discount_type: r.discount_type as string,
          discount_value: r.discount_value as number | null,
          affiliate_url: r.affiliate_url as string,
          expires_at: r.expires_at as string | null,
          image_url: r.image_url as string | null,
          last_posted_at: r.last_posted_at as string | null,
          store_name: extractStoreName(r.stores),
        }))
      : null;

    // Filtra ainda mais lojas pequenas (7 dias mínimo entre reposts)
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - COOLDOWN_HOURS_SMALL);
    const smallStores = [
      "Wise", "Nubank", "Kast", "Natura BR", "E-book Bitcoin",
      "Ledger", "Shopclub", "ShopClub", "Booking", "Hostinger",
      "Binance", "Bybit", "Trezor"
    ];

    // Filtro de produtos LIXO (livros, adesivos, etc) — proteção extra
    const LIXO_WORDS = [
      "livro", "livros", "ebook", "kindle", "literatura",
      "adesivo", "etiqueta", "etiquetas",
      "cupom de desconto", "cupons de desconto",
      "cartão de desconto", "cartões de desconto",
      "guia jurídico", "guia juridico",
      "fio de chenille",
      "edition", "portuguese edition",
    ];

    if (data && data.length > 0) {
      // 1. Remove produtos LIXO
      let filtered = (data as Coupon[]).filter(c => {
        const desc = c.description.toLowerCase();
        return !LIXO_WORDS.some(w => desc.includes(w));
      });

      // 2. Remove produtos de lojas pequenas postados há menos de 12h
      filtered = filtered.filter(c => {
        if (!smallStores.some(s => c.store_name.includes(s))) return true;
        if (!c.last_posted_at) return true;
        const lastPost = new Date(c.last_posted_at);
        return lastPost < twelveHoursAgo;
      });

      // Sobrescreve data com a lista filtrada
      data.length = 0;
      data.push(...filtered);
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0)
      return NextResponse.json({ ok: false, msg: "Nenhum cupom ativo. Rode /api/sync primeiro." });

    // Prioriza lojas com MUITOS produtos (AliExpress, Amazon, ML, AWIN)
    // Reduz frequência de lojas genéricas (Wise, Nubank, Kast, etc)
    // Lojas grandes — aparecem mais (3x por batch)
    const priorityStores = [
      "AliExpress", "Amazon", "Mercado Livre",
      "KaBuM", "Kabum", // Kabum tem 214 produtos, deve ser priority
      // Todos os AWIN merchants aprovados
      "LG BR", "Stanley BR", "Arno BR", "Panasonic BR",
      "Lacoste BR", "Café L'or BR", "Evas BR",
      "Alianças Imperiais BR", "Zé Delivery BR", "VIVÃO",
      // Lojas Lomadee de alto volume
      "Lomadee Partners",
    ];
    const lowPriorityStores = [
      "Wise", "Nubank", "Kast", "Natura BR", "E-book Bitcoin",
      "Ledger", "Shopclub", "ShopClub", "Booking", "Hostinger",
      "Binance", "Bybit", "Trezor",
    ];

    const shuffled: Coupon[] = [];
    const byStore: Record<string, Coupon[]> = {};

    // Agrupa por loja
    for (const c of data as Coupon[]) {
      if (!byStore[c.store_name]) byStore[c.store_name] = [];
      byStore[c.store_name].push(c);
    }

    // Embaralha AGRESSIVAMENTE dentro de cada loja (Fisher-Yates)
    for (const k of Object.keys(byStore)) {
      const arr = byStore[k];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    // ROUND-ROBIN SIMPLES — máximo 3 produtos por loja prioritária, 1 por loja pequena
    const MAX_PER_PRIORITY = 3;
    const MAX_PER_NORMAL   = 2;
    const MAX_PER_LOW      = 1;

    const usedFromStore: Record<string, number> = {};
    const seenUrls = new Set<string>();

    // Ordena: PRIORITY primeiro (embaralhadas), depois NORMAL, depois LOW
    // Garante que lojas com muitos produtos (AliExpress, Kabum, LG, etc) sempre apareçam
    const allKeys = Object.keys(byStore);
    const priorityKeys: string[] = [];
    const normalKeys: string[] = [];
    const lowKeys: string[] = [];

    for (const k of allKeys) {
      if (lowPriorityStores.some(l => k.includes(l))) {
        lowKeys.push(k);
      } else if (priorityStores.some(p => k.includes(p))) {
        priorityKeys.push(k);
      } else {
        normalKeys.push(k);
      }
    }

    // Embaralha cada bucket separadamente (Fisher-Yates)
    const shuffle = <T>(arr: T[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    };
    shuffle(priorityKeys);
    shuffle(normalKeys);
    shuffle(lowKeys);

    // Ordem final: prioritárias PRIMEIRO, depois normais, depois low
    const storeKeys = [...priorityKeys, ...normalKeys, ...lowKeys];

    // Round-robin: dá 1 produto de cada loja por vez, máximo MAX_PER_X por loja
    let stillHas = true;
    while (shuffled.length < limit && stillHas) {
      stillHas = false;
      for (const k of storeKeys) {
        if (shuffled.length >= limit) break;

        // Define máximo dessa loja
        const isPriority = priorityStores.some(p => k.includes(p));
        const isLow      = lowPriorityStores.some(l => k.includes(l));
        const maxFromStore = isLow ? MAX_PER_LOW : isPriority ? MAX_PER_PRIORITY : MAX_PER_NORMAL;

        const used = usedFromStore[k] ?? 0;
        if (used >= maxFromStore) continue;
        if (used >= byStore[k].length) continue;

        const candidate = byStore[k][used];

        // Evita URLs duplicadas no batch
        if (seenUrls.has(candidate.affiliate_url)) {
          usedFromStore[k] = used + 1;
          stillHas = true;
          continue;
        }

        shuffled.push(candidate);
        seenUrls.add(candidate.affiliate_url);
        usedFromStore[k] = used + 1;
        stillHas = true;
      }
    }

    const results = [];
    const now = new Date().toISOString();

    for (const coupon of shuffled) {
      try {
        // ⚠️ RESERVA O PRODUTO ANTES DE ENVIAR — evita race condition
        // Se outro cron já reservou (last_posted_at recente), pula
        const reserveThreshold = new Date();
        reserveThreshold.setMinutes(reserveThreshold.getMinutes() - 30); // 30 min de proteção

        const { data: updated } = await supabase
          .from("coupons")
          .update({ last_posted_at: now })
          .eq("id", coupon.id)
          .or(`last_posted_at.is.null,last_posted_at.lt.${reserveThreshold.toISOString()}`)
          .select("id");

        // Se update não pegou nada, outro processo já reservou
        if (!updated || updated.length === 0) {
          results.push({ id: coupon.id, store: coupon.store_name, ok: false, error: "Já enviado por outro processo" });
          continue;
        }

        const text   = format(coupon);
        let msgId: number | undefined;

        // Sempre usa sendMessage — Telegram puxa preview automático do link
        msgId = await sendMessage(text, TOKEN, CHAT_ID);

        // Já atualizou last_posted_at acima (na reserva)
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
