/**
 * POST /api/sync-awin-feed
 * Baixa o data feed CSV.GZ do AWIN, descompacta e salva produtos no banco.
 *
 * Body: { "feedUrl": "https://productdata.awin.com/..." }
 * ou GET: ?secret=...&feedUrl=https://...
 */

import { createClient } from "@supabase/supabase-js";
import { gunzip } from "zlib";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";

const gunzipAsync = promisify(gunzip);

function okAuth(req: NextRequest) {
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

// Parseia CSV simples (sem library externa)
function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse simples — assume que os valores não têm vírgulas
    const values = line.split(",").map(v => v.trim());
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

export async function POST(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { feedUrl?: string };
  let feedUrl = body.feedUrl ?? req.nextUrl.searchParams.get("feedUrl") ?? "";

  if (!feedUrl) {
    return NextResponse.json({
      error: "Passe { feedUrl: 'https://productdata.awin.com/...' } no body"
    }, { status: 400 });
  }

  try {
    console.log(`[AWIN Feed] Baixando ${feedUrl.substring(0, 80)}...`);

    // 1. Baixa o arquivo GZ
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      return NextResponse.json({
        error: `Feed download failed: ${res.status}`,
        detail: await res.text().then(t => t.substring(0, 200))
      }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    console.log(`[AWIN Feed] Downloaded ${buffer.byteLength} bytes`);

    // 2. Descompacta GZIP
    const decompressed = await gunzipAsync(Buffer.from(buffer));
    const csv = decompressed.toString("utf-8");
    console.log(`[AWIN Feed] Decompressed ${csv.length} chars`);

    // 3. Parseia CSV
    const rows = parseCSV(csv);
    console.log(`[AWIN Feed] Parsed ${rows.length} products`);

    if (rows.length === 0) {
      return NextResponse.json({
        ok: false,
        msg: "Nenhum produto encontrado no feed"
      });
    }

    // 4. Salva no Supabase
    const supabase = db();
    let synced = 0;
    const storeIds: Record<string, string> = {}; // Cache de merchant_id → store.id

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const coupons: Record<string, unknown>[] = [];

      for (const row of batch) {
        const merchantName = row["merchant_name"] ?? "";
        const merchantId   = row["merchant_id"] ?? "";
        const productName  = row["product_name"] ?? "";
        const deepLink     = row["aw_deep_link"] ?? "";
        const searchPrice  = parseFloat(row["search_price"] ?? "0");
        const rrrPrice     = parseFloat(row["rrp_price"] ?? "0");
        const savingsPct   = parseFloat(row["savings_percent"] ?? "0");
        const imageUrl     = row["aw_image_url"] ?? "";

        if (!merchantId || !productName || !deepLink) continue;

        // 4a. Garante que a store existe (cache)
        if (!storeIds[merchantId]) {
          const { data: store } = await supabase
            .from("stores")
            .upsert(
              {
                slug: `awin-${merchantId}`,
                name: merchantName,
                website_url: `https://www.awin.com/merchants/${merchantId}`,
                affiliate_network: "awin",
                is_active: true
              },
              { onConflict: "slug" }
            )
            .select("id")
            .single();
          storeIds[merchantId] = store?.id ?? "";
        }

        const storeId = storeIds[merchantId];
        if (!storeId) continue;

        // 4b. Monta descrição
        const desc = rrrPrice > 0 && searchPrice > 0 && rrrPrice > searchPrice
          ? `De R$${rrrPrice.toFixed(0)} por R$${searchPrice.toFixed(0)} — ${productName}`
          : searchPrice > 0
          ? `R$${searchPrice.toFixed(0)} — ${productName}`
          : productName;

        const discount = savingsPct > 0 ? Math.round(savingsPct) : null;

        coupons.push({
          store_id:       storeId,
          code:           "",
          description:    desc,
          discount_type:  discount ? "percent" : "other",
          discount_value: discount,
          affiliate_url:  deepLink,
          external_id:    `awin-${merchantId}-${row["aw_product_id"] ?? row["merchant_product_id"] ?? productName.substring(0, 20)}`,
          image_url:      imageUrl,
          is_verified:    true,
          is_active:      true,
          expires_at:     null,
        });
      }

      if (coupons.length > 0) {
        const { error } = await supabase
          .from("coupons")
          .upsert(coupons, { onConflict: "external_id" });
        if (!error) synced += coupons.length;
      }
    }

    return NextResponse.json({
      ok: true,
      received: rows.length,
      synced,
      unique_merchants: Object.keys(storeIds).length,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    console.error("[AWIN Feed Error]", e);
    return NextResponse.json({
      error: String(e)
    }, { status: 500 });
  }
}
