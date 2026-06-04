/**
 * POST /api/ads/pause?secret=XXX&id=CAMPAIGN_ID
 * GET /api/ads/pause?secret=XXX&id=CAMPAIGN_ID&action=resume
 *
 * Pausa ou ativa uma campanha
 */

import { MetaAPI } from "@/lib/meta-api";
import { NextRequest, NextResponse } from "next/server";

function okAuth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const S = process.env.SYNC_SECRET ?? "";
  return secret === S;
}

async function handle(req: NextRequest) {
  if (!okAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const action = req.nextUrl.searchParams.get("action") ?? "pause";

  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const meta = new MetaAPI();
  if (!meta.isConfigured()) {
    return NextResponse.json({ error: "Meta API não configurada" }, { status: 500 });
  }

  try {
    const result = action === "resume" || action === "activate"
      ? await meta.activateCampaign(id)
      : await meta.pauseCampaign(id);

    return NextResponse.json({
      ok: true,
      action,
      campaign_id: id,
      result,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
