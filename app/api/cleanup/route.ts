/**
 * GET /api/cleanup?secret=XXX
 * Remove produtos LIXO do banco — livros, ebooks, adesivos, etc
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

const BLOCKED_WORDS = [
  "desconto", "descontos",
  "adesivo", "adesivos",
  "etiqueta", "etiquetas",
  "cupom", "cupons",
  "ebook", "kindle",
  "livro", "livros",
  "literatura", "ficção",
  "edition",
  "fio de chenille",
  "tag de preço",
  "guia jurídico",
  "guia juridico",
  "cartão de desconto",
];

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = db();

    // Busca todos cupons Amazon ativos
    const { data: coupons, error } = await supabase
      .from("coupons")
      .select("id, description, external_id")
      .like("external_id", "amz-%")
      .eq("is_active", true)
      .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!coupons || coupons.length === 0) {
      return NextResponse.json({ ok: true, msg: "Nenhum cupom Amazon ativo" });
    }

    // Identifica produtos lixo
    const toDeactivate: string[] = [];
    for (const c of coupons) {
      const desc = (c.description ?? "").toLowerCase();
      if (BLOCKED_WORDS.some(w => desc.includes(w))) {
        toDeactivate.push(c.id);
      }
    }

    if (toDeactivate.length === 0) {
      return NextResponse.json({
        ok: true,
        total: coupons.length,
        removed: 0,
        msg: "Nenhum produto lixo encontrado"
      });
    }

    // Desativa em batches de 50
    let removed = 0;
    for (let i = 0; i < toDeactivate.length; i += 50) {
      const batch = toDeactivate.slice(i, i + 50);
      const { error: e } = await supabase
        .from("coupons")
        .update({ is_active: false })
        .in("id", batch);
      if (!e) removed += batch.length;
    }

    return NextResponse.json({
      ok: true,
      total: coupons.length,
      removed,
      examples: toDeactivate.slice(0, 5),
      ts: new Date().toISOString(),
    });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
