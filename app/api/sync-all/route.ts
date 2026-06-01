/**
 * GET /api/sync-all
 * Endpoint MASTER — sincroniza TODAS as fontes em sequência.
 *
 * Recomendado: rodar 1x/dia via cron-job.org (substitui Lomadee + AWIN merchants)
 *
 * Ordem de execução (em série pra não saturar Supabase):
 * 1. Lomadee     (~ 10s, 100 produtos)
 * 2. Kabum       (~ 15s, 300 produtos)
 * 3. VTEX Stores (~ 30s, 230 produtos)
 * 4. AWIN Merchants (~  5s,  30 produtos)
 *
 * Total: ~60s — cabe nos 90s do Vercel Hobby
 */

import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const auth   = req.headers.get("authorization") ?? "";
  const S = process.env.SYNC_SECRET ?? "";
  const C = process.env.CRON_SECRET ?? "";
  return secret === S || auth === `Bearer ${S}` || auth === `Bearer ${C}`;
}

const BASE = "https://cupomhoje.vercel.app";

async function callInternal(path: string, secret: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${BASE}${path}?secret=${secret}`, {
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, body: (await res.text()).slice(0, 200) };
    }
    return await res.json() as Record<string, unknown>;
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  const results: Record<string, unknown> = {};
  const startTime = Date.now();

  // 1. Lomadee
  const t1 = Date.now();
  results.lomadee = await callInternal("/api/sync-lomadee", secret);
  (results.lomadee as Record<string, unknown>)._ms = Date.now() - t1;

  // 2. Kabum
  const t2 = Date.now();
  results.kabum = await callInternal("/api/sync-kabum", secret);
  (results.kabum as Record<string, unknown>)._ms = Date.now() - t2;

  // 3. VTEX Stores
  const t3 = Date.now();
  results.vtex = await callInternal("/api/sync-vtex-stores", secret);
  (results.vtex as Record<string, unknown>)._ms = Date.now() - t3;

  // 4. AWIN Merchants (URLs estáticas)
  const t4 = Date.now();
  results.awin_merchants = await callInternal("/api/sync-awin-merchants", secret);
  (results.awin_merchants as Record<string, unknown>)._ms = Date.now() - t4;

  return NextResponse.json({
    ok: true,
    total_ms: Date.now() - startTime,
    results,
    ts: new Date().toISOString(),
  });
}
