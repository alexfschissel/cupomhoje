/**
 * GET /api/ads/list?secret=XXX
 * Lista todas as campanhas + métricas resumidas
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

  const meta = new MetaAPI();
  if (!meta.isConfigured()) {
    return NextResponse.json({
      error: "Meta API não configurada",
      missing: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_PAGE_ID"],
    }, { status: 500 });
  }

  try {
    const account = await meta.getAccountInfo();
    const campaigns = await meta.listCampaigns();

    // Pega métricas de cada campanha
    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const insights = await meta.getCampaignInsights(c.id, "maximum");
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          created_time: c.created_time,
          insights: insights ? {
            impressions: parseInt(insights.impressions ?? "0"),
            clicks: parseInt(insights.clicks ?? "0"),
            spend: parseFloat(insights.spend ?? "0"),
            cpc: parseFloat(insights.cpc ?? "0"),
            ctr: parseFloat(insights.ctr ?? "0"),
            reach: parseInt(insights.reach ?? "0"),
          } : null,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      account: {
        name: account.name,
        currency: account.currency,
        balance: parseFloat((account.balance as string) ?? "0") / 100, // convert cents to BRL
        total_spent: parseFloat((account.amount_spent as string) ?? "0") / 100,
        status: account.account_status,
      },
      campaigns: enriched,
      total: enriched.length,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
