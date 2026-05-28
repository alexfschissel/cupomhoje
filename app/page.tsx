const CANAL      = "https://t.me/cupomhojeoficial";
const COMUNIDADE = "https://t.me/cupomhojecomunidade";

const STORES = [
  "Amazon", "Shein", "Shopee", "Magazine Luiza", "Americanas",
  "Mercado Livre", "iFood", "Netshoes", "KaBuM!", "Drogasil",
  "AliExpress", "Casas Bahia",
];

function TgIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.048 9.647c-.152.68-.549.847-1.113.527l-3.07-2.263-1.481 1.425c-.164.164-.3.3-.616.3l.22-3.12 5.668-5.12c.247-.22-.054-.342-.382-.122L7.48 14.56l-3.03-.946c-.66-.205-.673-.66.137-.977l11.847-4.568c.549-.2 1.03.122.847.977z" />
    </svg>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">

      {/* ── NAV ── */}
      <nav className="border-b border-white/[0.06] px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="CupomHoje" className="w-8 h-8 rounded-lg object-cover" />
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
      <section className="relative px-5 pt-20 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF5A1F]/[0.07] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          {/* badge */}
          <div className="inline-flex items-center gap-2 bg-[#229ED9]/10 border border-[#229ED9]/20 text-[#229ED9] rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#229ED9] animate-pulse" />
            Canal oficial no Telegram
          </div>

          <h1 className="font-black text-5xl md:text-6xl leading-[1.08] mb-5">
            Cupons grátis<br />
            <span className="text-[#FF5A1F]">todo dia</span><br />
            no seu Telegram
          </h1>

          <p className="text-white/50 text-lg mb-9 max-w-md mx-auto leading-relaxed">
            Receba os melhores cupons verificados das maiores lojas do Brasil —
            direto no app, sem spam, sem cadastro.
          </p>

          {/* CTAs */}
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

          {/* stats */}
          <div className="flex justify-center gap-12 mt-14 pt-10 border-t border-white/[0.06]">
            {[
              ["2x", "por dia"],
              ["100%", "gratuito"],
              ["20+", "lojas"],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="font-black text-2xl text-[#FF5A1F]">{v}</div>
                <div className="text-white/25 text-xs uppercase tracking-wider mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREVIEW TELEGRAM ── */}
      <section className="px-5 py-14">
        <h2 className="text-center font-black text-2xl mb-2">O que você vai receber</h2>
        <p className="text-center text-white/35 text-sm mb-9">Assim chegam os cupons no seu Telegram</p>

        <div className="max-w-sm mx-auto bg-[#17212B] rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl">
          {/* header do canal */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF7340] to-[#D93000] flex items-center justify-center text-sm shrink-0">
              🏷️
            </div>
            <div>
              <p className="text-white font-semibold text-sm">CupomHoje</p>
              <p className="text-white/35 text-xs">canal · cupons verificados</p>
            </div>
          </div>

          {/* mensagens */}
          <div className="p-4 space-y-3">
            <div className="bg-[#1E2D3A] rounded-xl p-3.5 text-sm">
              <p className="text-[#FF5A1F] font-bold mb-2">🏷️ SHEIN — 15% OFF</p>
              <p className="text-white/75 mb-1">💰 <strong className="text-white">15% de desconto</strong> em toda a loja</p>
              <p className="text-white/60 mb-3 text-xs">
                Código: <code className="bg-white/10 text-[#FF5A1F] px-1.5 py-0.5 rounded font-mono">SHEIN15</code>
                &nbsp;· válido até 30/06
              </p>
              <span className="inline-block bg-[#FF5A1F] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                🛒 Comprar com desconto
              </span>
            </div>

            <div className="bg-[#1E2D3A] rounded-xl p-3.5 text-sm">
              <p className="text-[#FF5A1F] font-bold mb-2">⚡ AMAZON — Frete Grátis</p>
              <p className="text-white/75 mb-1">🚚 <strong className="text-white">Frete grátis</strong> acima de R$79</p>
              <p className="text-white/45 mb-3 text-xs">Desconto automático · sem código</p>
              <span className="inline-block bg-[#FF5A1F] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                🛒 Aproveitar oferta
              </span>
            </div>

            <p className="text-white/20 text-xs text-center">📲 @cupomhojeoficial</p>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="px-5 py-14 max-w-3xl mx-auto">
        <h2 className="text-center font-black text-2xl mb-10">Como funciona</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "1", icon: "📲", title: "Entre no canal", desc: "Clique no botão e entre no canal oficial. Sem cadastro, sem senha." },
            { n: "2", icon: "🔔", title: "Receba todo dia", desc: "Cupons verificados chegam automaticamente às 9h e às 18h." },
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

      {/* ── LOJAS ── */}
      <section className="px-5 py-10 max-w-2xl mx-auto text-center">
        <h2 className="font-black text-xl mb-2">Lojas parceiras</h2>
        <p className="text-white/30 text-sm mb-6">Cupons verificados dessas e muito mais lojas</p>
        <div className="flex flex-wrap justify-center gap-2">
          {STORES.map((s) => (
            <span key={s} className="bg-white/[0.04] border border-white/[0.07] text-white/50 text-sm px-4 py-1.5 rounded-full hover:text-white/70 hover:bg-white/[0.07] transition-colors">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-5 py-16 text-center">
        <div className="max-w-md mx-auto bg-gradient-to-b from-[#FF5A1F]/10 to-transparent border border-[#FF5A1F]/20 rounded-3xl p-10">
          <div className="text-5xl mb-4">🏷️</div>
          <h2 className="font-black text-2xl mb-3">Pronto para economizar?</h2>
          <p className="text-white/40 text-sm mb-7 leading-relaxed">
            Próximos cupons chegam automaticamente. Não perca nenhuma oferta.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={CANAL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1b90c8] text-white font-bold py-3.5 rounded-2xl transition-colors"
            >
              <TgIcon size={18} /> Canal Oficial
            </a>
            <a
              href={COMUNIDADE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] text-white/70 font-semibold py-3.5 rounded-2xl border border-white/10 transition-colors"
            >
              <TgIcon size={18} /> Comunidade
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] px-5 py-7">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white/25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-6 h-6 rounded-md object-cover opacity-40" />
            <span className="font-bold text-sm">CupomHoje</span>
          </div>
          <p className="text-white/15 text-xs text-center">
            © 2025 CupomHoje · Afiliados das lojas parceiras · Preços sujeitos a alteração
          </p>
          <div className="flex gap-4">
            <a href={CANAL} target="_blank" rel="noopener noreferrer" className="text-[#229ED9]/40 hover:text-[#229ED9] text-xs transition-colors flex items-center gap-1">
              <TgIcon size={11} /> @cupomhojeoficial
            </a>
            <a href={COMUNIDADE} target="_blank" rel="noopener noreferrer" className="text-[#229ED9]/40 hover:text-[#229ED9] text-xs transition-colors flex items-center gap-1">
              <TgIcon size={11} /> @cupomhojecomunidade
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
