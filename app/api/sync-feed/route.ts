import { createClient } from "@supabase/supabase-js";
import { createGunzip } from "zlib";
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

// Parser CSV que suporta campos com aspas e vírgulas dentro
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuote = false;
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === "," && !inQuote) {
      result.push(current.trim()); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export async function GET(req: NextRequest) {
  if (!ok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const FEED_KEY = process.env.AWIN_FEED_KEY;
  if (!FEED_KEY)
    return NextResponse.json({ error: "AWIN_FEED_KEY não configurado no Vercel" }, { status: 500 });

  // Feed ID 103134 = LG BR Product Feed FTP 2025 (2.719 produtos)
  const FEED_ID = req.nextUrl.searchParams.get("fid") ?? "103134";
  const MAX     = parseInt(req.nextUrl.searchParams.get("max") ?? "40");
  const feedUrl = `https://productdata.awin.com/datafeed/download/apikey/${FEED_KEY}/fid/${FEED_ID}/format/csv/language/pt/delimiter/%2C/compression/gzip/`;

  try {
    // 1. Baixa o feed (gzip)
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) return NextResponse.json({ error: `Feed HTTP ${res.status}` }, { status: 502 });

    // 2. Descomprime gzip
    const buffer = Buffer.from(await res.arrayBuffer());
    const text: string = await new Promise((resolve, reject) => {
      const gz = createGunzip();
      const chunks: Buffer[] = [];
      gz.on("data", (c: Buffer) => chunks.push(c));
      gz.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      gz.on("error", reject);
      gz.end(buffer);
    });

    const allLines = text.split("\n").filter(l => l.trim());
    if (allLines.length < 2) return NextResponse.json({ error: "Feed vazio" }, { status: 500 });

    // 3. Mapeia colunas
    const headers = parseCSVLine(allLines[0]);
    const col = (name: string) => headers.indexOf(name);

    const C_LINK  = col("aw_deep_link");
    const C_NAME  = col("product_name");
    const C_ID    = col("aw_product_id");
    const C_PRICE = col("search_price");
    const C_RRP   = col("rrp_price");
    const C_DISC  = col("savings_percent");
    const C_STOCK = col("in_stock");
    const C_MERC  = col("merchant_name");
    const C_IMG   = col("merchant_image_url");

    // Debug: mostra o header e a primeira linha para entender a estrutura
    const debug = req.nextUrl.searchParams.get("debug") === "1";
    if (debug) {
      const sample = parseCSVLine(allLines[1] ?? "");
      const map: Record<string, string> = {};
      headers.forEach((h, i) => { map[h] = sample[i] ?? ""; });
      return NextResponse.json({ headers, sample: map, total_rows: allLines.length - 1 });
    }

    // 4. Pega os primeiros MAX produtos que tenham link e nome
    const rows = allLines.slice(1)
      .map(l => parseCSVLine(l))
      .filter(f => f[C_LINK]?.startsWith("http") && f[C_NAME]?.length > 0)
      .sort((a, b) => parseFloat(b[C_DISC] ?? "0") - parseFloat(a[C_DISC] ?? "0"))
      .slice(0, MAX);

    if (rows.length === 0)
      return NextResponse.json({ ok: true, synced: 0, msg: "Nenhum produto com link encontrado no feed" });

    // 5. Identifica o anunciante (loja)
    const merchantName = rows[0][C_MERC] ?? "LG BR";
    const storeSlug    = merchantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const supabase = db();
    const { data: storeRow } = await supabase
      .from("stores")
      .upsert({ slug: storeSlug, name: merchantName, affiliate_network: "awin", is_active: true }, { onConflict: "slug" })
      .select("id").single();

    if (!storeRow?.id) return NextResponse.json({ error: "Falha ao criar store" }, { status: 500 });

    // 6. Upsert dos produtos
    let synced = 0, skipped = 0, firstError = "";

    for (const f of rows) {
      const link      = f[C_LINK];
      const name      = f[C_NAME]?.slice(0, 150) ?? "";
      const productId = f[C_ID];
      const price     = parseFloat(f[C_PRICE] ?? "") || null;
      const rrp       = parseFloat(f[C_RRP]   ?? "") || null;
      const disc      = parseFloat(f[C_DISC]  ?? "") || null;

      if (!link || !productId) { skipped++; continue; }

      const desc = rrp && price && rrp > price
        ? `De R$${rrp.toFixed(0)} por R$${price.toFixed(0)} — ${name}`
        : name;

      const { error } = await supabase.from("coupons").upsert({
        store_id:       storeRow.id,
        code:           "",
        description:    desc,
        discount_type:  disc && disc > 0 ? "percent" : "other",
        discount_value: disc,
        affiliate_url:  link,
        external_id:    `awin-feed-${productId}`,
        is_verified:    true,
        is_active:      true,
        expires_at:     null,
      }, { onConflict: "external_id" });

      if (error) { firstError = firstError || error.message; skipped++; }
      else { synced++; }
    }

    return NextResponse.json({
      ok: true,
      feed_id: FEED_ID,
      store: merchantName,
      total_in_feed: allLines.length - 1,
      with_discount: rows.length,
      synced, skipped,
      ...(firstError ? { error: firstError } : {}),
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
