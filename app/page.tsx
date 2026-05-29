import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "CupomHoje — Cupons grátis no Telegram",
  description:
    "Receba os melhores cupons verificados das maiores lojas do Brasil todo dia no Telegram. 100% grátis, sem spam.",
};

const CANAL      = "https://t.me/cupomhojeoficial";
const COMUNIDADE = "https://t.me/cupomhojecomunidade";

// Lojas com links de afiliado
const LOJAS = [
  {
    nome: "AliExpress",
    logo: "https://logo.clearbit.com/aliexpress.com",
    desc: "Até 80% OFF",
    cupons: 20,
    url: "https://pt.aliexpress.com",
  },
  {
    nome: "Amazon",
    logo: "https://logo.clearbit.com/amazon.com.br",
    desc: "Frete grátis acima de R$79",
    cupons: 15,
    url: "https://amzn.to/4u0Mtck",
  },
  {
    nome: "LG BR",
    logo: "https://logo.clearbit.com/lg.com",
    desc: "TVs e monitores com desconto",
    cupons: 40,
    url: "https://tidd.ly/4e8Oz5k",
  },
  {
    nome: "Stanley BR",
    logo: "https://logo.clearbit.com/stanley1913.com",
    desc: "Produtos premium Stanley",
    cupons: 5,
    url: "https://tidd.ly/4wYe9S1",
  },
  {
    nome: "Arno BR",
    logo: "https://logo.clearbit.com/arno.com.br",
    desc: "Eletrodomésticos de qualidade",
    cupons: 5,
    url: "https://tidd.ly/3RyU4l7",
  },
  {
    nome: "Evas BR",
    logo: "https://logo.clearbit.com/evas.com.br",
    desc: "Moda feminina com estilo",
    cupons: 10,
    url: "https://tidd.ly/4tWdsG1",
  },
  {
    nome: "Binance",
    logo: "https://logo.clearbit.com/binance.com",
    desc: "Bônus exclusivo no cadastro",
    cupons: 1,
    url: "https://www.binance.com/referral/earn-together/refer2earn-usdc/claim?hl=pt&ref=GRO_28502_8H8KI&utm_source=bitcoinagora",
  },
  {
    nome: "Bybit",
    logo: "https://logo.clearbit.com/bybit.com",
    desc: "Até $30.000 em bônus",
    cupons: 1,
    url: "https://www.bybit.com/invite?ref=RKKGRO",
  },
  {
    nome: "Ledger",
    logo: "https://logo.clearbit.com/ledger.com",
    desc: "Carteira hardware Bitcoin",
    cupons: 1,
    url: "https://shop.ledger.com/pt/pages/referral-program?referral_code=KX6C02RWJNBKE",
  },
  {
    nome: "Wise",
    logo: "https://logo.clearbit.com/wise.com",
    desc: "Transferências internacionais",
    cupons: 1,
    url: "https://wise.com/invite/ilpc/alexfernandos13",
  },
  {
    nome: "Nubank",
    logo: "https://logo.clearbit.com/nubank.com.br",
    desc: "Conta com rendimento > poupança",
    cupons: 1,
    url: "https://nubank.com.br/indicacao/nu/?id=toVXBhZlgfZSVRRj6jl_hw",
  },
  {
    nome: "Kast",
    logo: "https://logo.clearbit.com/kast.xyz",
    desc: "Cartão crypto grátis",
    cupons: 1,
    url: "https://go.kast.xyz/VqVO/N137G56K",
  },
];

function TgIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.048 9.647c-.152.68-.549.847-1.113.527l-3.07-2.263-1.481 1.425c-.164.164-.3.3-.616.3l.22-3.12 5.668-5.12c.247-.22-.054-.342-.382-.122L7.48 14.56l-3.03-.946c-.66-.205-.673-.66.137-.977l11.847-4.568c.549-.2 1.03.122.847.977z" />
    </svg>
  );
}

export default function Page() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white">

      {/* ── NAV ── */}
      <nav className="border-b border-white/[0.06] px-5 py-3 sticky top-0 bg-[#0A0A0A]/95 backdrop-blur z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="CupomHoje" width={36} height={36} className="rounded-xl" />
            <span className="font-black text-base tracking-tight">CupomHoje</span>
          </div>
          <a
            href={CANAL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#229ED9] hover:bg-[#1b90c8] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <TgIcon size={14} />
            Entrar no canal
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative px-5 pt-16 pb-12 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#FF5A1F]/[0.07] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#229ED9]/10 border border-[#229ED9]/20 text-[#229ED9] rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#229ED9] animate-pulse" />
            Canal oficial no Telegram
          </div>

          <h1 className="font-black text-5xl md:text-6xl leading-[1.08] mb-5">
            Cupons grátis<br />
            <span className="text-[#FF5A1F]">todo dia</span><br />
            no seu Telegram
          </h1>

          <p className="text-white/50 text-lg mb-8 max-w-md mx-auto leading-relaxed">
            Receba os melhores cupons verificados das maiores lojas do Brasil —
            direto no app, sem spam, sem cadastro.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={CANAL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-[#229ED9] hover:bg-[#1b90c8] active:scale-[0.97] text-white font-bold text-base px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-[#229ED9]/20"
            >
              <TgIcon size={20} />
              Canal Oficial
            </a>
            <a
              href={COMUNIDADE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-white/[0.05] hover:bg-white/[0.09] active:scale-[0.97] text-white font-semibold text-base px-8 py-3.5 rounded-2xl transition-all border border-white/10"
            >
              <TgIcon size={20} />
              Comunidade
            </a>
          </div>

          <p className="mt-4 text-white/20 text-sm">Grátis · Sem spam · Saia quando quiser</p>

          {/* Stats */}
          <div className="flex justify-center gap-12 mt-12 pt-8 border-t border-white/[0.06]">
            {[["2x", "por dia"], ["100%", "gratuito"], ["20+", "lojas"]].map(([v, l]) => (
              <div key={l}>
                <div className="font-black text-2xl text-[#FF5A1F]">{v}</div>
                <div className="text-white/25 text-xs uppercase tracking-wider mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOJAS COM DESCONTOS ── */}
      <section className="px-5 py-12 max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-black text-2xl">Lojas com descontos</h2>
            <p className="text-white/35 text-sm mt-1">Clique para ver as ofertas com link de afiliado</p>
          </div>
          <a href={CANAL} target="_blank" rel="noopener noreferrer"
             className="text-[#FF5A1F] text-sm font-semibold hover:underline hidden sm:block">
            Ver todas no canal →
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {LOJAS.map((loja) => (
            <a
              key={loja.nome}
              href={loja.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 flex flex-col items-center text-center hover:bg-white/[0.08] hover:border-white/15 transition-all"
            >
              {/* Logo */}
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center mb-3 overflow-hidden shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={loja.logo}
                  alt={loja.nome}
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.style.display = "none";
                    t.parentElement!.innerHTML = `<span style="font-weight:900;font-size:18px;color:#333">${loja.nome.slice(0, 2).toUpperCase()}</span>`;
                  }}
                />
              </div>

              {/* Nome */}
              <p className="font-bold text-white text-sm leading-tight mb-1">{loja.nome}</p>

              {/* Desconto */}
              <p className="text-[#FF5A1F] text-xs font-semibold">{loja.desc}</p>

              {/* Cupons */}
              <p className="text-white/25 text-[10px] mt-1">{loja.cupons} oferta{loja.cupons > 1 ? "s" : ""}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="px-5 py-12 max-w-3xl mx-auto">
        <h2 className="font-black text-2xl text-center mb-10">Como funciona</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "1", icon: "📲", title: "Entre no canal", desc: "Clique no botão e entre no canal oficial. Sem cadastro, sem senha." },
            { n: "2", icon: "🔔", title: "Receba todo dia", desc: "Cupons verificados chegam automaticamente com % de desconto e preços." },
            { n: "3", icon: "💰", title: "Economize", desc: "Clique no link e economize nas suas compras com desconto real." },
          ].map((s) => (
            <div key={s.n} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center hover:border-white/10 transition-colors">
              <div className="w-12 h-12 bg-[#FF5A1F] rounded-xl flex items-center justify-center text-xl mx-auto mb-4">{s.icon}</div>
              <div className="text-[#FF5A1F] text-xs font-bold uppercase tracking-wider mb-1">Passo {s.n}</div>
              <h3 className="font-bold text-white mb-2">{s.title}</h3>
              <p className="text-white/35 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PREVIEW TELEGRAM ── */}
      <section className="px-5 py-12">
        <div className="max-w-sm mx-auto">
          <h2 className="font-black text-2xl text-center mb-2">O que você vai receber</h2>
          <p className="text-white/35 text-sm text-center mb-8">Assim chegam os cupons no Telegram</p>

          <div className="bg-[#17212B] rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <Image src="/logo.png" alt="CupomHoje" width={36} height={36} className="rounded-full" />
              <div>
                <p className="text-white font-semibold text-sm">CupomHoje</p>
                <p className="text-white/35 text-xs">canal · cupons verificados</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-[#1E2D3A] rounded-xl p-3.5 text-sm">
                <p className="font-bold text-white mb-1">🏷 ALIEXPRESS</p>
                <p className="text-white/30 text-xs mb-2">━━━━━━━━━━━━━━━━</p>
                <p className="text-[#FF5A1F] font-bold text-xs mb-1">🏷 56% OFF</p>
                <p className="text-white/70 text-xs mb-1">💲 De R$110 por R$48</p>
                <p className="text-white/80 mb-2">🛒 Fone Bluetooth TWS Pro com cancelamento de ruído</p>
                <p className="text-white/50 text-xs mb-2">💰 56% de desconto · ✅ Desconto automático</p>
                <span className="inline-block bg-[#FF5A1F] text-white text-xs font-bold px-3 py-1.5 rounded-lg">🛒 COMPRAR NO ALIEXPRESS</span>
              </div>
              <p className="text-white/20 text-xs text-center">📲 @cupomhojeoficial</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-5 py-14 text-center">
        <div className="max-w-md mx-auto bg-gradient-to-b from-[#FF5A1F]/10 to-transparent border border-[#FF5A1F]/20 rounded-3xl p-10">
          <div className="text-5xl mb-4">🏷️</div>
          <h2 className="font-black text-2xl mb-3">Pronto para economizar?</h2>
          <p className="text-white/40 text-sm mb-7 leading-relaxed">
            Próximos cupons chegam automaticamente. Não perca nenhuma oferta.
          </p>
          <div className="flex flex-col gap-3">
            <a href={CANAL} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1b90c8] text-white font-bold py-3.5 rounded-2xl transition-colors">
              <TgIcon /> Canal Oficial
            </a>
            <a href={COMUNIDADE} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] text-white/70 font-semibold py-3.5 rounded-2xl border border-white/10 transition-colors">
              <TgIcon /> Comunidade
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] px-5 py-7">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="CupomHoje" width={24} height={24} className="rounded-md opacity-50" />
            <span className="font-bold text-sm text-white/30">CupomHoje</span>
          </div>
          <p className="text-white/15 text-xs text-center">
            © 2025 CupomHoje · Somos afiliados das lojas parceiras · Preços sujeitos a alteração
          </p>
          <div className="flex gap-4">
            <a href={CANAL} target="_blank" rel="noopener noreferrer"
               className="text-[#229ED9]/40 hover:text-[#229ED9] text-xs transition-colors flex items-center gap-1">
              <TgIcon size={11} /> @cupomhojeoficial
            </a>
            <a href={COMUNIDADE} target="_blank" rel="noopener noreferrer"
               className="text-[#229ED9]/40 hover:text-[#229ED9] text-xs transition-colors flex items-center gap-1">
              <TgIcon size={11} /> @cupomhojecomunidade
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
