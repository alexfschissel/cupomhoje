/**
 * GET /api/ads/metrics?secret=XXX&period=last_7d
 * Métricas agregadas da conta no período
 *
 * Períodos: today, yesterday, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, maximum
 */

import { MetaAPI } from "@/lib/meta-api";
import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S;
}

export async function GET(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = req.nextUrl.searchParams.get("period") ?? "last_7d";

  const meta = new MetaAPI();
  if (!meta.isConfigured()) {
    return NextResponse.json({ error: "Meta API não configurada" }, { status: 500 });
  }

  try {
    const insights = await meta.getAllInsights(period);

    if (!insights) {
      return NextResponse.json({
        ok: true,
        period,
        metrics: null,
        msg: "Sem dados pra esse período",
      });
    }

    const spend = parseFloat(insights.spend ?? "0");
    const clicks = parseInt(insights.clicks ?? "0");
    const impressions = parseInt(insights.impressions ?? "0");

    return NextResponse.json({
      ok: true,
      period,
      metrics: {
        impressions,
        clicks,
        spend,
        cpc: clicks > 0 ? spend / clicks : 0,
        ctr: parseFloat(insights.ctr ?? "0"),
        reach: parseInt(insights.reach ?? "0"),
        frequency: parseFloat((insights as Record<string, unknown>).frequency as string ?? "0"),
      },
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
