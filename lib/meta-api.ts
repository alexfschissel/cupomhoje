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

  async post(path: string, body: Record<string, unknown>, customToken?: string): Promise<Record<string, unknown>> {
    const url = `${BASE_URL}${path}`;
    const formData = new URLSearchParams();
    formData.set("access_token", customToken ?? this.token);
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

  // ─── Pega Page Access Token (bypass app dev mode) ─────
  async getPageAccessToken(): Promise<string | null> {
    try {
      const result = await this.get("/me/accounts", { fields: "id,access_token" });
      const pages = (result.data ?? []) as Array<{ id: string; access_token: string }>;
      const page = pages.find(p => p.id === this.pageId);
      return page?.access_token ?? null;
    } catch (e) {
      console.error("[getPageAccessToken]", String(e));
      return null;
    }
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

  // ─── CRIAR campanha completa (Campaign + AdSet + Ad) ────
  async createFullCampaign(opts: {
    name: string;
    dailyBudgetBRL: number;  // R$ por dia (será convertido em cents)
    targetUrl: string;        // Link de destino (Telegram)
    imageHash?: string;       // Hash da imagem (uploadada antes)
    imageUrl?: string;        // OU URL da imagem (alternativa)
    messageText: string;      // Texto principal
    headlineText?: string;    // Título curto
    descriptionText?: string; // Descrição
    ctaType?: string;         // SIGN_UP, LEARN_MORE, SUBSCRIBE
    ageMin?: number;
    ageMax?: number;
  }) {
    const {
      name,
      dailyBudgetBRL,
      targetUrl,
      imageHash,
      imageUrl,
      messageText,
      headlineText = "Cupons grátis no Telegram 🏷",
      descriptionText = "Amazon, AliExpress, Shopee — nova oferta a cada 15 min",
      ctaType = "SIGN_UP",
      ageMin = 22,
      ageMax = 45,
    } = opts;

    // 1. Cria CAMPAIGN
    const campaign = await this.post(`/${this.adAccountId}/campaigns`, {
      name,
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED", // começa pausada pra revisar antes
      special_ad_categories: "[]",
      buying_type: "AUCTION",
      is_adset_budget_sharing_enabled: "false",
    });

    if (!campaign.id) {
      return { error: "Falha ao criar campaign", details: campaign };
    }
    const campaignId = campaign.id as string;

    // 2. Cria AD SET (com targeting Brasil + interesses cupons)
    const targeting = {
      age_min: ageMin,
      age_max: ageMax,
      geo_locations: { countries: ["BR"] },
      flexible_spec: [
        {
          interests: [
            { id: "6003002193982", name: "Amazon.com (varejista)" },
            { id: "6019154143076", name: "AliExpress" },
            { id: "6003190690001", name: "MercadoLivre" },
            { id: "6003054884732", name: "Cupons (cupons e descontos)" },
            { id: "6003263791114", name: "Compras (varejo)" },
            { id: "6003221485467", name: "Comércio eletrônico (varejo)" },
            { id: "6003346592981", name: "Compras na internet (varejo)" },
            { id: "6003899365666", name: "Descontos (varejo)" },
            { id: "6003363111021", name: "black friday (compras)" },
            { id: "6003093445217", name: "cyber monday (compras)" },
          ],
        },
      ],
      device_platforms: ["mobile"],
      publisher_platforms: ["facebook", "instagram"],
      facebook_positions: ["feed", "story", "instream_video"],
      instagram_positions: ["stream", "story", "reels"],
      targeting_automation: { advantage_audience: 0 }, // 0=desabilitado, 1=habilitado
    };

    const adSet = await this.post(`/${this.adAccountId}/adsets`, {
      name: `${name} - AdSet`,
      campaign_id: campaignId,
      daily_budget: Math.round(dailyBudgetBRL * 100), // BRL para cents
      billing_event: "IMPRESSIONS",
      optimization_goal: "LANDING_PAGE_VIEWS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting,
      status: "ACTIVE",
      start_time: new Date().toISOString(),
    });

    if (!adSet.id) {
      return { error: "Falha ao criar adset", details: adSet, campaign_id: campaignId };
    }
    const adSetId = adSet.id as string;

    // 3. Cria POST NA PÁGINA primeiro (com Page Token)
    // Depois usa esse post_id como object_story_id no creative
    // Isso bypassa app dev mode porque o post é da página, não do app
    const pageToken = await this.getPageAccessToken();

    if (!pageToken) {
      return { error: "Falha ao obter Page Access Token", campaign_id: campaignId, ad_set_id: adSetId };
    }

    // 3a. Cria post oculto (unpublished) na página
    const postBody: Record<string, unknown> = {
      message: messageText,
      link: targetUrl,
      published: "false", // post não fica visível no feed da página
    };

    if (imageUrl) postBody.picture = imageUrl;

    const post = await this.post(`/${this.pageId}/feed`, postBody, pageToken);

    if (!post.id) {
      return { error: "Falha ao criar post na página", details: post, campaign_id: campaignId, ad_set_id: adSetId };
    }
    const postId = post.id as string;

    // 3b. Cria creative usando o post_id (object_story_id)
    const creative = await this.post(`/${this.adAccountId}/adcreatives`, {
      name: `${name} - Creative`,
      object_story_id: postId,
    });

    if (!creative.id) {
      return { error: "Falha ao criar creative", details: creative, campaign_id: campaignId, ad_set_id: adSetId };
    }
    const creativeId = creative.id as string;

    // 4. Cria AD
    const ad = await this.post(`/${this.adAccountId}/ads`, {
      name: `${name} - Ad`,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: "ACTIVE",
    });

    return {
      ok: true,
      campaign_id: campaignId,
      ad_set_id: adSetId,
      creative_id: creativeId,
      ad_id: ad.id ?? null,
      campaign_status: "PAUSED",
      message: "Campanha criada como PAUSED. Ative pelo dashboard quando quiser começar.",
    };
  }

  // ─── Upload de imagem pra Meta (retorna image_hash) ───
  async uploadImageFromUrl(imageUrl: string): Promise<string | null> {
    try {
      // 1. Baixa a imagem
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
      if (!imgRes.ok) return null;
      const buffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      // 2. Sobe no Meta
      const result = await this.post(`/${this.adAccountId}/adimages`, {
        bytes: base64,
      });

      // result.images.{filename}.hash
      const images = (result.images ?? {}) as Record<string, { hash?: string }>;
      const firstKey = Object.keys(images)[0];
      return firstKey ? images[firstKey].hash ?? null : null;
    } catch (e) {
      console.error("[uploadImage]", String(e));
      return null;
    }
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
