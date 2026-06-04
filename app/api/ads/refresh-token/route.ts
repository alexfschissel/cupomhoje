/**
 * GET /api/ads/refresh-token?secret=XXX
 * Converte o token atual (curta duração) em token de 60 dias.
 *
 * Requer env vars:
 * - META_ACCESS_TOKEN (token atual)
 * - META_APP_ID
 * - META_APP_SECRET
 */

import { exchangeForLongLivedToken } from "@/lib/meta-api";
import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S;
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.META_ACCESS_TOKEN ?? "";
  const appId = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";

  if (!token || !appId || !appSecret) {
    return NextResponse.json({
      error: "Variáveis faltando",
      missing: {
        META_ACCESS_TOKEN: !token,
        META_APP_ID: !appId,
        META_APP_SECRET: !appSecret,
      },
    }, { status: 500 });
  }

  try {
    const result = await exchangeForLongLivedToken(token, appId, appSecret);

    if (!result) {
      return NextResponse.json({ error: "Falha ao converter token" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      msg: "Token long-lived gerado. Cole no META_ACCESS_TOKEN do Vercel e redeploy.",
      new_token: result.access_token,
      token_type: result.token_type,
      expires_in_seconds: result.expires_in,
      expires_in_days: result.expires_in ? Math.round(result.expires_in / 86400) : null,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
