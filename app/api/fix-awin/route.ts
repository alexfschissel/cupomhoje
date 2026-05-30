/**
 * GET /api/fix-awin?secret=XXX
 * Atualiza produtos AWIN sem discount_value, calculando a partir do preço
 * ou aplicando default de 10% para produtos elegíveis.
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

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    // Busca todos produtos AWIN (feed + merchants) ativos sem discount
    const { data: rows, error } = await supabase
      .from("coupons")
      .select("id, description, discount_value")
      .like("external_id", "awin-%")
      .eq("is_active", true)
      .is("discount_value", null)
      .limit(2000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, msg: "Nenhum produto AWIN sem discount", updated: 0 });
    }

    // Para cada produto, tenta extrair desconto da descrição "De R$X por R$Y — Nome"
    const updates: { id: string; discount_value: number }[] = [];

    for (const r of rows) {
      const desc = r.description ?? "";
      // Padrão: "De R$X por R$Y — Nome"
      const match = desc.match(/De R\$(\d+(?:\.\d+)?)\s*por\s*R\$(\d+(?:\.\d+)?)/i);

      let discount: number = 10; // default 10% se não conseguir calcular

      if (match) {
        const orig = parseFloat(match[1]);
        const sale = parseFloat(match[2]);
        if (orig > sale && orig > 0) {
          discount = Math.round(((orig - sale) / orig) * 100);
        }
      }

      if (discount < 5) discount = 5;
      if (discount > 90) discount = 50;

      updates.push({ id: r.id, discount_value: discount });
    }

    // Atualiza em batches de 50
    let updated = 0;
    for (let i = 0; i < updates.length; i += 50) {
      const batch = updates.slice(i, i + 50);
      // Não dá pra fazer UPDATE em batch no Supabase via PostgREST sem upsert
      // Vou fazer um por um (mais lento mas funciona)
      for (const u of batch) {
        const { error: e } = await supabase
          .from("coupons")
          .update({ discount_value: u.discount_value, discount_type: "percent" })
          .eq("id", u.id);
        if (!e) updated++;
      }
    }

    return NextResponse.json({
      ok: true,
      total_found: rows.length,
      updated,
      sample: updates.slice(0, 3),
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
