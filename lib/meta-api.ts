/**
 * Meta Marketing API Wrapper
 * Documentação: https://developers.facebook.com/docs/marketing-api/
 *
 * Env vars necessárias:
 * - META_ACCESS_TOKEN
 * - META_AD_ACCOUNT_ID (formato: act_XXXXXXX)
 * - META_PAGE_ID
 * - META_BUSINESS_ID (opcional)
 */

const API_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective?: string;
  created_time?: string;
};

export type MetaInsights = {
  impressions?: string;
  clicks?: string;
  spend?: string;
  cpc?: string;
  ctr?: string;
  reach?: string;
  date_start?: string;
  date_stop?: string;
};

export class MetaAPI {
  private token: string;
  private adAccountId: string;
  private pageId: string;

  constructor() {
    this.token = process.env.META_ACCESS_TOKEN ?? "";
    this.adAccountId = process.env.META_AD_ACCOUNT_ID ?? "";
    this.pageId = process.env.META_PAGE_ID ?? "";
  }

  isConfigured(): boolean {
    return !!(this.token && this.adAccountId && this.pageId);
  }

  // ─── Helpers ─────────────────────────────────────────
  async get(path: string, params: Record<string, string> = {}): Promise<Record<string, unknown>> {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("access_token", this.token);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
    return await res.json();
  }

  async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const url = `${BASE_URL}${path}`;
    const formData = new URLSearchParams();
    formData.set("access_token", this.token);
    for (const [k, v] of Object.entries(body)) {
      formData.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000),
    });
    return await res.json();
  }

  // ─── Account info ────────────────────────────────────
  async getAccountInfo() {
    return await this.get(`/${this.adAccountId}`, {
      fields: "name,account_status,currency,balance,amount_spent,timezone_name",
    });
  }

  // ─── Campanhas ───────────────────────────────────────
  async listCampaigns(): Promise<MetaCampaign[]> {
    const result = await this.get(`/${this.adAccountId}/campaigns`, {
      fields: "name,status,objective,created_time,daily_budget,lifetime_budget,start_time,stop_time",
      limit: "50",
    });
    return (result.data as MetaCampaign[]) ?? [];
  }

  async getCampaign(campaignId: string) {
    return await this.get(`/${campaignId}`, {
      fields: "name,status,objective,daily_budget,start_time,stop_time,buying_type",
    });
  }

  async pauseCampaign(campaignId: string) {
    return await this.post(`/${campaignId}`, { status: "PAUSED" });
  }

  async activateCampaign(campaignId: string) {
    return await this.post(`/${campaignId}`, { status: "ACTIVE" });
  }

  // ─── Métricas ────────────────────────────────────────
  async getCampaignInsights(campaignId: string, datePreset: string = "maximum"): Promise<MetaInsights | null> {
    const result = await this.get(`/${campaignId}/insights`, {
      fields: "impressions,clicks,spend,cpc,ctr,reach,frequency,actions",
      date_preset: datePreset,
    });
    const data = (result.data as MetaInsights[]) ?? [];
    return data[0] ?? null;
  }

  async getAllInsights(datePreset: string = "last_7d"): Promise<MetaInsights | null> {
    const result = await this.get(`/${this.adAccountId}/insights`, {
      fields: "impressions,clicks,spend,cpc,ctr,reach,frequency",
      date_preset: datePreset,
    });
    const data = (result.data as MetaInsights[]) ?? [];
    return data[0] ?? null;
  }

  // ─── Ad Sets / Anúncios ──────────────────────────────
  async listAdSets(campaignId: string) {
    return await this.get(`/${campaignId}/adsets`, {
      fields: "name,status,daily_budget,targeting,billing_event,optimization_goal",
    });
  }

  async listAds(campaignId: string) {
    return await this.get(`/${campaignId}/ads`, {
      fields: "name,status,effective_status,created_time",
    });
  }
}

// ─── Helper: Long-lived token (60 dias) ──────────────
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string,
): Promise<{ access_token: string; token_type: string; expires_in?: number } | null> {
  try {
    const url = new URL(`${BASE_URL}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("client_secret", appSecret);
    url.searchParams.set("fb_exchange_token", shortLivedToken);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (data.error) {
      console.error("[Meta long-lived token]", data.error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("[Meta exchange token]", String(e));
    return null;
  }
}
