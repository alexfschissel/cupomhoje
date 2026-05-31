import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
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

function toSlug(name: string, suffix: string) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    + "-" + suffix;
}

// ── AliExpress signing ────────────────────────────────────────────────────────
function signAliExpress(params: Record<string, string>, secret: string): string {
  // AliExpress TOP API usa MD5: SECRET + sorted_kvs + SECRET
  const sorted = Object.keys(params).sort();
  let str = secret;
  for (const key of sorted) str += key + params[key];
  str += secret;
  return createHash("md5").update(str).digest("hex").toUpperCase();
}

// ── AliExpress — busca por keyword com filtros de qualidade ──────────────────
async function fetchAliExpressKeyword(
  keyword: string,
  APP_KEY: string,
  APP_SECRET: string,
  TRACKING: string,
): Promise<Record<string, unknown>[]> {
  const timestamp = Date.now().toString();

  // Faixa de preço configurável via env (padrão: bem aberto R$5–R$2000)
  const minPrice = process.env.ALIEXPRESS_MIN_PRICE ?? "5";
  const maxPrice = process.env.ALIEXPRESS_MAX_PRICE ?? "2000";

  const params: Record<string, string> = {
    app_key:         APP_KEY,
    method:          "aliexpress.affiliate.hotproduct.query", // Advanced API aprovada
    sign_method:     "md5",
    timestamp,
    v:               "2.0",
    keywords:        keyword,
    page_no:         "1",
    page_size:       "50",              // máximo permitido
    target_currency: "BRL",
    target_language: "PT",
    sort:            "DISCOUNT_DESC",   // maior desconto primeiro
    min_sale_price:  minPrice,
    max_sale_price:  maxPrice,
  };
  if (TRACKING) params.tracking_id = TRACKING;
  params.sign = signAliExpress(params, APP_SECRET);

  const res = await fetch("https://api-sg.aliexpress.com/sync", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams(params).toString(),
    signal:  AbortSignal.timeout(15000),
  });

  if (!res.ok) return [];

  const json = await res.json() as Record<string, unknown>;
  const resp   = (json["aliexpress_affiliate_hotproduct_query_response"]
               ?? json["aliexpress_affiliate_product_query_response"]) as Record<string, unknown> | undefined;
  const result = (resp?.resp_result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
  const list   = (result?.products as Record<string, unknown> | undefined)?.product;

  if (!Array.isArray(list)) return [];

  // Filtro de qualidade local: mínimo 10% de desconto + avaliação ≥ 4 estrelas (80%)
  const MIN_DISCOUNT = parseInt(process.env.ALIEXPRESS_MIN_DISCOUNT ?? "5");
  const MIN_RATING   = parseFloat(process.env.ALIEXPRESS_MIN_RATING ?? "80");

  return list.filter((p: Record<string, unknown>) => {
    const discountPct = parseFloat(String(p.discount ?? "0").replace("%",""));
    const rating      = parseFloat(String(p.evaluate_rate ?? "0").replace("%",""));
    return discountPct >= MIN_DISCOUNT && (rating === 0 || rating >= MIN_RATING);
  });
}

// ── AliExpress sync principal ─────────────────────────────────────────────────
async function syncAliExpress(supabase: ReturnType<typeof db>) {
  const APP_KEY    = process.env.ALIEXPRESS_APP_KEY;
  const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET;
  const TRACKING   = process.env.ALIEXPRESS_TRACKING_ID ?? "";

  if (!APP_KEY || !APP_SECRET)
    return { synced: 0, skipped: 0, error: "ALIEXPRESS_APP_KEY ou ALIEXPRESS_APP_SECRET não configurados" };

  // Keywords MASSIVAS — cobertura de TODAS as 22 categorias AliExpress
  const DEFAULT_KEYWORDS = [
    // 🎮 Gaming / Consoles / Anime (Toys & Games + Books & Media)
    "lego", "pokemon cards", "mario kart", "zelda", "nintendo switch", "game boy",
    "playstation", "sega genesis", "sonic", "pop mart", "8bitdo controller",
    "naruto figure", "dragon ball figure", "one piece figure", "anime figure", "funko pop",
    "jojo bizarre", "gundam model", "trading card", "pokemon tcg",

    // 🚗 Carros / Colecionáveis (Toys + Automotive)
    "hot wheels", "miniatura carro", "mini gt", "diecast model car",
    "pop race", "tomica", "matchbox cars",

    // 🎧 Eletrônicos / Tech (Electronics + Cell Phones)
    "fone bluetooth", "smartwatch", "carregador rapido", "cabo usb c",
    "caixa de som bluetooth", "iphone case", "samsung case",
    "ssd nvme", "ssd sata", "hub usb c", "dock station", "magsafe wallet",
    "mouse sem fio", "teclado mecanico", "webcam", "ring light",
    "anbernic console", "raspberry pi", "drone mini",

    // 🏠 Casa / Cozinha (Appliances + Furniture + Patio)
    "luminaria led", "panela inox", "garrafa termica", "lampada led",
    "organizador cozinha", "frigideira antiaderente", "cafeteira",
    "aspirador portatil", "ventilador usb", "umidificador",

    // 💄 Beleza / Saúde (Beauty & Health)
    "perfume importado", "maquiagem", "chapinha cabelo", "secador cabelo",
    "kit sobrancelha", "cilios posticos", "kit unha", "cortador unha",
    "esmalte gel", "sombra olhos", "batom matte",

    // 🩺 Saúde / Cuidados
    "fio dental", "nebulizador", "organizador comprimidos", "massageador",
    "termometro digital", "balança digital",

    // 🏋️ Esportes / Outdoor (Sports & Outdoors)
    "tenis esportivo", "mochila esportiva", "garrafa academia",
    "elastico fitness", "luva academia", "rolinho yoga", "barraca camping",

    // 🐕 Pet (Pet Supplies)
    "brinquedo pet", "comedouro pet", "coleira cachorro", "guia cachorro",
    "fonte gato", "arranhador gato",

    // 👶 Bebê / Maternidade (Baby & Maternity)
    "carrinho bebe", "babador bebe", "chupeta", "mordedor bebe",

    // 📚 Papelaria / Office (Office & School)
    "caneta gel", "marcador acrilico", "fita adesiva dupla", "sticker book",
    "impressora termica", "organizador papelaria", "agenda planner",

    // 👜 Bolsas / Acessórios (Bags & Luggage)
    "mochila escolar", "bolsa feminina", "carteira couro", "mala viagem",

    // 👞 Sapatos (Shoes)
    "tenis casual", "sandalia feminina", "sapato social",

    // 💎 Joias / Acessórios (Jewelry)
    "colar prata", "brinco ouro", "pulseira couro", "relogio masculino",

    // 🔧 Ferramentas (Tools & Home Improvement)
    "parafusadeira", "kit chaves", "fita metrica", "trena laser",
    "organizador ferramentas",

    // 🚗 Auto (Automotive)
    "suporte celular carro", "cobertor carro", "tapete carro",
    "cabo bateria carro",

    // 🎨 Artes / Costura (Arts, Crafts & Sewing)
    "pincel pintura", "tela canvas", "linha croche", "agulha tricot",
  ];

  // Permite override via env, mas usa lista padrão se vazio
  const rawKeywords = process.env.ALIEXPRESS_KEYWORDS ?? "";
  const keywords = rawKeywords
    ? rawKeywords.split(",").map(k => k.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS;

  try {
    const products: Record<string, unknown>[] = [];
    const seen = new Set<string>();

    // Busca em PARALELO mas em lotes de 5 para não estourar limite de API
    const BATCH_SIZE = 5;
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(kw => fetchAliExpressKeyword(kw, APP_KEY, APP_SECRET, TRACKING))
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          for (const p of r.value) {
            const id = String(p.product_id ?? "");
            if (id && !seen.has(id)) { seen.add(id); products.push(p); }
          }
        }
      }
      // 500ms entre lotes para evitar rate limit
      if (i + BATCH_SIZE < keywords.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (products.length === 0)
      return { synced: 0, skipped: 0, error: "Nenhum produto encontrado no AliExpress" };

    // Garante que a loja AliExpress existe
    const { data: aliStore } = await supabase
      .from("stores")
      .upsert({ slug: "aliexpress", name: "AliExpress", website_url: "https://aliexpress.com", affiliate_network: "aliexpress", is_active: true }, { onConflict: "slug" })
      .select("id").single();

    if (!aliStore?.id) return { synced: 0, skipped: 0, error: "Falha ao criar loja AliExpress" };

    let synced = 0, skipped = 0, firstError = "";

    for (const p of products) {
      const productId   = String(p.product_id ?? "");
      const title       = String(p.product_title ?? "").slice(0, 150);
      const discountStr = String(p.discount ?? "").replace("%", "");
      const discount    = parseFloat(discountStr) || null;

      // Preços — Advanced API retorna "BRL 67.80", remove letras e espaços
      const saleRaw  = String(p.target_sale_price     ?? "").replace(/[^\d.]/g, "");
      const origRaw  = String(p.target_original_price ?? "").replace(/[^\d.]/g, "");
      const salePrice = parseFloat(saleRaw) > 0 ? parseFloat(saleRaw) : null;
      const origPrice = parseFloat(origRaw) > 0 ? parseFloat(origRaw) : null;

      if (!productId) { skipped++; continue; }

      // Imagem
      const imageUrl = String(p.product_main_image_url ?? "").trim() || null;

      // Link: Advanced API já retorna promotion_link rastreado
      const promoLink =
        String(p.promotion_link     ?? "").trim() ||
        String(p.product_detail_url ?? "").trim() ||
        `https://pt.aliexpress.com/item/${productId}.html`;

      // Descrição com preços reais
      const desc = origPrice && salePrice && origPrice > salePrice
        ? `De R$${origPrice.toFixed(0)} por R$${salePrice.toFixed(0)} — ${title}`
        : salePrice
        ? `R$${salePrice.toFixed(0)} — ${title}`
        : title;

      const { error } = await supabase.from("coupons").upsert({
        store_id:       aliStore.id,
        code:           "",
        description:    desc,
        discount_type:  discount ? "percent" : "other",
        discount_value: discount,
        affiliate_url:  promoLink,
        external_id:    `ali-${productId}`,
        image_url:      imageUrl,
        is_verified:    true,
        is_active:      true,
        expires_at:     null,
      }, { onConflict: "external_id" });

      if (error) { skipped++; firstError = firstError || error.message; }
      else { synced++; }
    }

    return { synced, skipped, keywords, ...(firstError ? { upsert_error: firstError } : {}) };

  } catch (e) {
    return { synced: 0, skipped: 0, error: `AliExpress erro: ${String(e)}` };
  }
}

// ── AWIN ─────────────────────────────────────────────────────────────────────
async function syncAwin(supabase: ReturnType<typeof db>) {
  const PID = process.env.AWIN_PUBLISHER_ID;
  const TOK = process.env.AWIN_API_TOKEN;
  if (!PID || !TOK) return { synced: 0, skipped: 0, error: "AWIN não configurado" };

  try {
    const res = await fetch(
      `https://api.awin.com/publishers/${PID}/promotions`,
      { headers: { Authorization: `Bearer ${TOK}` }, cache: "no-store", signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) {
      const t = await res.text();
      return { synced: 0, skipped: 0, error: `AWIN ${res.status}: ${t.slice(0, 200)}` };
    }

    const json = await res.json() as { promotions?: Record<string, unknown>[] };
    const promos = json.promotions ?? [];
    if (promos.length === 0) return { synced: 0, skipped: 0, error: "Nenhuma promoção AWIN disponível" };

    let synced = 0, skipped = 0;
    for (const p of promos.slice(0, 300)) {
      const advertiserId   = String(p.advertiserId ?? "");
      const advertiserName = String(p.advertiserName ?? "Loja");
      const promoId        = String(p.promotionId ?? p.id ?? "");
      if (!advertiserId || !promoId) { skipped++; continue; }

      const { data: store } = await supabase
        .from("stores")
        .upsert({ slug: toSlug(advertiserName, `aw-${advertiserId}`), name: advertiserName, affiliate_id: advertiserId, affiliate_network: "awin", is_active: true }, { onConflict: "slug" })
        .select("id").single();
      if (!store?.id) { skipped++; continue; }

      const rawType      = String(p.discountType ?? p.type ?? "").toLowerCase();
      const discountType = rawType.includes("percent") ? "percent" : rawType.includes("cash") || rawType.includes("fixed") ? "fixed" : rawType.includes("ship") ? "free_shipping" : "other";
      const discountValue = (p.discountAmount as { amount?: number } | null)?.amount ?? null;
      const advertUrl     = String(p.advertiserUrl ?? "");
      const affiliateUrl  = `https://www.awin1.com/cread.php?awinmid=${advertiserId}&awinaffid=${PID}&p=${encodeURIComponent(advertUrl)}`;

      const { error } = await supabase.from("coupons").upsert({
        store_id: store.id, code: String(p.code ?? ""),
        description: String(p.description ?? p.displayTitle ?? p.title ?? "Promoção"),
        discount_type: discountType, discount_value: discountValue,
        affiliate_url: affiliateUrl, external_id: `awin-${promoId}`,
        is_verified: true, is_active: true,
        expires_at: p.endDate ? new Date(String(p.endDate)).toISOString() : null,
      }, { onConflict: "external_id" });

      error ? skipped++ : synced++;
    }
    return { synced, skipped };
  } catch (e) {
    return { synced: 0, skipped: 0, error: String(e) };
  }
}

// ── LOMADEE ───────────────────────────────────────────────────────────────────
// Endpoint v3 antigo (api.lomadee.com) foi DESCONTINUADO.
// Lomadee agora roda em /api/sync-lomadee usando api-beta.lomadee.com.br.

// ── HANDLER ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)  missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0)
    return NextResponse.json({ error: "Variáveis faltando", missing }, { status: 500 });

  try {
    const supabase = db();

    // Lomadee não roda aqui — usa endpoint dedicado /api/sync-lomadee
    // (api.lomadee.com v3 foi descontinuado; usar api-beta.lomadee.com.br)
    const [aliResult, awinResult] = await Promise.allSettled([
      syncAliExpress(supabase),
      syncAwin(supabase),
    ]);

    await supabase.from("coupons")
      .update({ is_active: false })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true);

    return NextResponse.json({
      ok:       true,
      aliexpress: aliResult.status    === "fulfilled" ? aliResult.value    : { error: String(aliResult.reason)    },
      awin:       awinResult.status   === "fulfilled" ? awinResult.value   : { error: String(awinResult.reason)   },
      lomadee:    { note: "Lomadee usa endpoint dedicado /api/sync-lomadee" },
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
