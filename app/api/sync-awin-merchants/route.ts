/**
 * POST /api/sync-awin-merchants
 * Sincroniza produtos apenas dos anunciantes AWIN aprovados.
 *
 * Merchants: LG BR, Café L'or BR, Panasonic BR, Zé Delivery BR,
 *           Stanley BR, Arno BR, Lacoste BR, Alianças Imperiais BR, Evas BR
 *
 * GET ?secret=... → roda o sync dos merchants
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

// Merchants aprovados com seus dados
const APPROVED_MERCHANTS = [
  { name: "LG BR", id: null },           // Será preenchido dinamicamente
  { name: "Café L'or BR", id: null },
  { name: "Panasonic BR", id: null },
  { name: "Zé Delivery BR", id: null },
  { name: "Stanley BR", id: null },
  { name: "Arno BR", id: null },
  { name: "Lacoste BR", id: null },
  { name: "Alianças Imperiais BR", id: null },
  { name: "Evas BR", id: null },
];

/**
 * Exemplo de dados que AWIN pode retornar (adaptado):
 * Usamos a API do AWIN ou feeds pré-salvos
 */
async function fetchMerchantProducts(merchantName: string): Promise<Record<string, unknown>[]> {
  // TODO: Implementar busca real via AWIN API
  // Por enquanto, retorna array vazio (será preenchido manualmente)
  console.log(`[AWIN] Buscando produtos de ${merchantName}...`);
  return [];
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();
    let totalSynced = 0;
    const results: Record<string, unknown>[] = [];

    for (const merchant of APPROVED_MERCHANTS) {
      const products = await fetchMerchantProducts(merchant.name);

      if (products.length === 0) {
        results.push({
          merchant: merchant.name,
          status: "pending",
          synced: 0,
          message: "Aguardando feed/API"
        });
        continue;
      }

      // Garante que a store existe
      const { data: store } = await supabase
        .from("stores")
        .upsert({
          slug: `awin-${merchant.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: merchant.name,
          website_url: "https://www.awin.com",
          affiliate_network: "awin",
          is_active: true
        }, { onConflict: "slug" })
        .select("id")
        .single();

      if (!store?.id) {
        results.push({ merchant: merchant.name, status: "error", message: "Falha ao criar store" });
        continue;
      }

      // Processa produtos
      const coupons: Record<string, unknown>[] = [];
      for (const prod of products) {
        const merchantName = prod["merchant_name"] ?? merchant.name;
        const productName  = prod["product_name"] ?? "";
        const deepLink     = prod["aw_deep_link"] ?? "";
        const searchPrice  = parseFloat(prod["search_price"] as string ?? "0");
        const rrpPrice     = parseFloat(prod["rrp_price"] as string ?? "0");
        const savingsPct   = parseFloat(prod["savings_percent"] as string ?? "0");
        const imageUrl     = prod["aw_image_url"] ?? "";

        if (!productName || !deepLink) continue;

        const desc = rrpPrice > 0 && searchPrice > 0 && rrpPrice > searchPrice
          ? `De R$${rrpPrice.toFixed(0)} por R$${searchPrice.toFixed(0)} — ${productName}`
          : searchPrice > 0
          ? `R$${searchPrice.toFixed(0)} — ${productName}`
          : productName;

        const discount = savingsPct > 0 ? Math.round(savingsPct) : null;

        coupons.push({
          store_id:       store.id,
          code:           "",
          description:    desc,
          discount_type:  discount ? "percent" : "other",
          discount_value: discount,
          affiliate_url:  deepLink,
          external_id:    `awin-${merchant.name}-${productName.substring(0, 30)}`,
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

        if (!error) {
          totalSynced += coupons.length;
          results.push({
            merchant: merchant.name,
            status: "success",
            synced: coupons.length
          });
        } else {
          results.push({
            merchant: merchant.name,
            status: "error",
            message: error.message
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      total_synced: totalSynced,
      merchants: APPROVED_MERCHANTS.length,
      results,
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // POST redireciona para GET
  return GET(req);
}
