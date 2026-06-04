/**
 * Dashboard /admin/ads?secret=XXX
 * Painel de controle dos anúncios Meta
 */

import { MetaAPI, type MetaCampaign, type MetaInsights } from "@/lib/meta-api";

export const dynamic = "force-dynamic";

async function fetchData(secret: string) {
  const expected = process.env.SYNC_SECRET ?? "";
  if (secret !== expected) return { error: "unauthorized" };

  const meta = new MetaAPI();
  if (!meta.isConfigured()) return { error: "missing_env" };

  try {
    const account = await meta.getAccountInfo() as Record<string, unknown>;
    const campaigns = await meta.listCampaigns();

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const insights = await meta.getCampaignInsights(c.id, "maximum");
        return { ...c, insights };
      })
    );

    const accountInsights = await meta.getAllInsights("last_7d");

    return { ok: true, account, campaigns: enriched, accountInsights };
  } catch (e) {
    return { error: String(e) };
  }
}

type CampaignWithInsights = MetaCampaign & { insights?: MetaInsights | null };

export default async function AdsAdmin({ searchParams }: { searchParams: { secret?: string } }) {
  const secret = searchParams.secret ?? "";
  const data = await fetchData(secret);

  if ("error" in data) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-8 font-sans">
        <h1 className="text-2xl mb-4">⚠️ Erro</h1>
        <p className="text-red-400">{data.error}</p>
        {data.error === "missing_env" && (
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded">
            <p className="font-bold mb-2">Configurar no Vercel:</p>
            <ul className="text-sm space-y-1 font-mono">
              <li>META_ACCESS_TOKEN</li>
              <li>META_AD_ACCOUNT_ID (act_XXXXXX)</li>
              <li>META_PAGE_ID</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  const { account, campaigns, accountInsights } = data;
  const acc = account as Record<string, unknown>;
  const balance = parseFloat((acc.balance as string) ?? "0") / 100;
  const totalSpent = parseFloat((acc.amount_spent as string) ?? "0") / 100;
  const last7Spend = accountInsights ? parseFloat(accountInsights.spend ?? "0") : 0;
  const last7Clicks = accountInsights ? parseInt(accountInsights.clicks ?? "0") : 0;
  const last7Impressions = accountInsights ? parseInt(accountInsights.impressions ?? "0") : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">📊 CupomHoje Ads Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Conta: {acc.name as string} · {acc.currency as string}</p>
        </header>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Saldo na Conta</p>
            <p className="text-2xl font-bold text-green-400">R$ {balance.toFixed(2)}</p>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Total Investido</p>
            <p className="text-2xl font-bold">R$ {totalSpent.toFixed(2)}</p>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Gasto Últimos 7 dias</p>
            <p className="text-2xl font-bold text-orange-400">R$ {last7Spend.toFixed(2)}</p>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Cliques Últimos 7d</p>
            <p className="text-2xl font-bold text-blue-400">{last7Clicks}</p>
            <p className="text-xs text-white/40 mt-1">{last7Impressions.toLocaleString()} impressões</p>
          </div>
        </div>

        {/* Tabela de campanhas */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-lg font-bold">📣 Campanhas ({(campaigns as CampaignWithInsights[]).length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr>
                  <th className="text-left p-4 font-semibold text-white/60 text-xs uppercase">Campanha</th>
                  <th className="text-left p-4 font-semibold text-white/60 text-xs uppercase">Status</th>
                  <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase">Impressões</th>
                  <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase">Cliques</th>
                  <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase">CTR</th>
                  <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase">CPC</th>
                  <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase">Gasto</th>
                  <th className="text-center p-4 font-semibold text-white/60 text-xs uppercase">Ação</th>
                </tr>
              </thead>
              <tbody>
                {(campaigns as CampaignWithInsights[]).map((c) => {
                  const i = c.insights;
                  const isActive = c.status === "ACTIVE";
                  const action = isActive ? "pause" : "resume";
                  return (
                    <tr key={c.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                      <td className="p-4">
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-xs text-white/40">{c.objective}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">{i?.impressions ?? "0"}</td>
                      <td className="p-4 text-right">{i?.clicks ?? "0"}</td>
                      <td className="p-4 text-right">{i?.ctr ? `${parseFloat(i.ctr).toFixed(2)}%` : "—"}</td>
                      <td className="p-4 text-right">{i?.cpc ? `R$ ${parseFloat(i.cpc).toFixed(2)}` : "—"}</td>
                      <td className="p-4 text-right font-semibold">{i?.spend ? `R$ ${parseFloat(i.spend).toFixed(2)}` : "R$ 0,00"}</td>
                      <td className="p-4 text-center">
                        <a
                          href={`/api/ads/pause?secret=${secret}&id=${c.id}&action=${action}`}
                          className={`inline-block px-3 py-1 rounded text-xs font-bold ${
                            isActive
                              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          }`}
                        >
                          {isActive ? "PAUSAR" : "ATIVAR"}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center text-white/30 text-xs">
          Atualizado em {new Date().toLocaleString("pt-BR")} ·
          <a href={`?secret=${secret}`} className="ml-2 text-blue-400 hover:underline">Recarregar</a>
        </footer>
      </div>
    </div>
  );
}
