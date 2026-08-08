/**
 * GET /api/cleanup-nicho?secret=XXX
 * Desativa produtos AliExpress ANTIGOS (que não são miniaturas Hot Wheels/Mini GT/Kaido/Matchbox)
 * Mantém apenas os do nicho novo.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S;
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Keywords que definem os produtos válidos do nicho
const NICHO_KEYWORDS = [
  "hot wheels", "hotwheels", "hot-wheels",
  "mini gt", "minigt", "mini-gt",
  "kaido house", "kaidohouse", "kaido-house", "kaidoi",
  "matchbox",
];

function isNichoProduct(description: string): boolean {
  const desc = description.toLowerCase();
  return NICHO_KEYWORDS.some(k => desc.includes(k));
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    // 1. Busca TODOS os produtos AliExpress ativos (limite Supabase é 1000, então paginamos)
    const aliProducts: Array<{ id: string; description: string; external_id: string }> = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page, error: pageError } = await supabase
        .from("coupons")
        .select("id, description, external_id")
        .like("external_id", "ali-%")
        .eq("is_active", true)
        .range(offset, offset + pageSize - 1);
      if (pageError) {
        return NextResponse.json({ error: pageError.message }, { status: 500 });
      }
      if (!page || page.length === 0) break;
      aliProducts.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
    const fetchError = null;

    void fetchError; // já tratado dentro do loop
    if (aliProducts.length === 0) {
      return NextResponse.json({ ok: true, msg: "Nenhum AliExpress ativo", desativados: 0 });
    }

    // 2. Separa: manter (nicho) vs desativar (não é nicho)
    const paraDesativar: string[] = [];
    const paraManter: string[] = [];

    for (const p of aliProducts) {
      if (isNichoProduct(p.description ?? "")) {
        paraManter.push(p.id);
      } else {
        paraDesativar.push(p.id);
      }
    }

    // 3. Desativa os não-nicho em batches de 100
    let desativados = 0;
    for (let i = 0; i < paraDesativar.length; i += 100) {
      const batch = paraDesativar.slice(i, i + 100);
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: false })
        .in("id", batch);
      if (!error) desativados += batch.length;
    }

    return NextResponse.json({
      ok: true,
      total_aliexpress: aliProducts.length,
      mantidos: paraManter.length,
      desativados,
      nicho_keywords: NICHO_KEYWORDS,
      note: "Produtos NÃO miniaturas desativados. Só nicho aparecerá no canal.",
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
