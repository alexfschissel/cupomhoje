import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "CupomHoje — Canal de Cupons e Descontos no Telegram",
  description:
    "Receba cupons exclusivos de AliExpress, Amazon, LG, Stanley e +20 lojas direto no Telegram. Economize todo dia. 100% grátis, sem spam, sem cadastro.",
  keywords: [
    "cupons desconto telegram", "cupom hoje", "descontos aliexpress",
    "cupom amazon brasil", "canal cupons telegram", "promoções online brasil",
    "cupons grátis", "descontos telegram canal",
  ],
  authors: [{ name: "CupomHoje" }],
  openGraph: {
    title: "CupomHoje — Cupons e Descontos todo dia no Telegram",
    description:
      "Entre no canal e receba os melhores cupons verificados das maiores lojas do Brasil. Grátis, sem spam.",
    url: "https://cupomhoje.vercel.app",
    siteName: "CupomHoje",
    type: "website",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "CupomHoje" }],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "CupomHoje — Cupons no Telegram",
    description: "Cupons verificados das maiores lojas do Brasil, todo dia no seu Telegram.",
  },
  robots: { index: true, follow: true },
};

const CANAL      = "https://t.me/cupomhojeoficial";
const COMUNIDADE = "https://t.me/cupomhojecomunidade";

const LOJAS = [
  { nome: "AliExpress", emoji: "🛒", cor: "#FF4747", cupons: 20, desc: "Até 80% OFF",              url: "https://pt.aliexpress.com?language=pt_BR" },
  { nome: "Amazon",     emoji: "📦", cor: "#FF9900", cupons: 15, desc: "Frete grátis acima R$79",  url: "https://amzn.to/4u0Mtck" },
  { nome: "LG BR",      emoji: "📺", cor: "#A50034", cupons: 40, desc: "TVs e monitores",          url: "https://tidd.ly/4e8Oz5k" },
  { nome: "Stanley BR", emoji: "☕", cor: "#1B5E20", cupons: 5,  desc: "Produtos premium",         url: "https://tidd.ly/4wYe9S1" },
  { nome: "Arno BR",    emoji: "🏠", cor: "#E53935", cupons: 5,  desc: "Eletrodomésticos",         url: "https://tidd.ly/3RyU4l7" },
  { nome: "Evas BR",    emoji: "💄", cor: "#AD1457", cupons: 10, desc: "Moda e beleza",            url: "https://tidd.ly/4tWdsG1" },
  { nome: "Binance",    emoji: "₿",  cor: "#F0B90B", cupons: 1,  desc: "Bônus no cadastro",       url: "https://www.binance.com/referral/earn-together/refer2earn-usdc/claim?hl=pt&ref=GRO_28502_8H8KI" },
  { nome: "Bybit",      emoji: "📈", cor: "#F7A600", cupons: 1,  desc: "Até $30.000 em bônus",    url: "https://www.bybit.com/invite?ref=RKKGRO" },
  { nome: "Ledger",     emoji: "🔐", cor: "#1C1C1C", cupons: 1,  desc: "Carteira hardware BTC",   url: "https://shop.ledger.com/pt/pages/referral-program?referral_code=KX6C02RWJNBKE" },
  { nome: "Wise",       emoji: "💸", cor: "#00B9A7", cupons: 1,  desc: "Transferências grátis",   url: "https://wise.com/invite/ilpc/alexfernandos13" },
  { nome: "Nubank",     emoji: "💜", cor: "#8A05BE", cupons: 1,  desc: "Rendimento > poupança",   url: "https://nubank.com.br/indicacao/nu/?id=toVXBhZlgfZSVRRj6jl_hw" },
  { nome: "Kast",       emoji: "💳", cor: "#6C5CE7", cupons: 1,  desc: "Cartão crypto grátis",    url: "https://go.kast.xyz/VqVO/N137G56K" },
];

function TgIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.048 9.647c-.152.68-.549.847-1.113.527l-3.07-2.263-1.481 1.425c-.164.164-.3.3-.616.3l.22-3.12 5.668-5.12c.247-.22-.054-.342-.382-.122L7.48 14.56l-3.03-.946c-.66-.205-.673-.66.137-.977l11.847-4.568c.549-.2 1.03.122.847.977z" />
    </svg>
  );
}

// ── Mockup do iPhone com notificação animada ──────────────────────────────────
function PhoneMockup() {
  return (
    <div className="relative flex justify-center items-center">
      {/* Glow */}
      <div className="absolute w-64 h-96 bg-[#229ED9]/20 rounded-full blur-3xl" />

      {/* Telefone */}
      <div className="animate-float-phone relative z-10">
        <div className="w-56 h-[450px] bg-[#1A1A1A] rounded-[40px] border-2 border-white/10 shadow-2xl overflow-hidden flex flex-col animate-glow">

          {/* Dynamic island */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-24 h-6 bg-black rounded-full" />
          </div>

          {/* Barra de status */}
          <div className="flex justify-between items-center px-5 pb-2 text-[10px] text-white/50">
            <span>9:41</span>
            <div className="flex gap-1.5">
              <svg width="12" height="10" fill="currentColor" viewBox="0 0 12 10"><rect x="0" y="3" width="2" height="7" rx="1"/><rect x="3" y="2" width="2" height="8" rx="1"/><rect x="6" y="0" width="2" height="10" rx="1"/><rect x="9" y="0" width="3" height="10" rx="1"/></svg>
            </div>
          </div>

          {/* Área de notificações — overflow hidden */}
          <div className="relative flex-1 px-3 overflow-hidden">

            {/* Notificação 1 */}
            <div className="animate-notif absolute left-3 right-3 top-2 bg-[#2C2C2E]/95 backdrop-blur rounded-2xl p-3 shadow-xl border border-white/[0.08]">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#FF7340] to-[#D93000] rounded-lg flex items-center justify-center text-sm shrink-0">🏷️</div>
                <div className="min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-white text-[11px] font-semibold">CupomHoje</p>
                    <p className="text-white/30 text-[10px]">agora</p>
                  </div>
                  <p className="text-[#FF5A1F] text-[10px] font-bold">🏷 ALIEXPRESS • 56% OFF</p>
                  <p className="text-white/70 text-[10px] leading-tight mt-0.5">Fone Bluetooth TWS Pro<br/>De R$110 por R$48 ✅</p>
                </div>
              </div>
            </div>

            {/* Notificação 2 */}
            <div className="animate-notif2 absolute left-3 right-3 top-2 bg-[#2C2C2E]/95 backdrop-blur rounded-2xl p-3 shadow-xl border border-white/[0.08]">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#FF7340] to-[#D93000] rounded-lg flex items-center justify-center text-sm shrink-0">🏷️</div>
                <div className="min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-white text-[11px] font-semibold">CupomHoje</p>
                    <p className="text-white/30 text-[10px]">agora</p>
                  </div>
                  <p className="text-[#FF5A1F] text-[10px] font-bold">🏷 LG BR • 37% OFF</p>
                  <p className="text-white/70 text-[10px] leading-tight mt-0.5">Monitor UltraGear 27" OLED<br/>De R$4699 por R$2999 ✅</p>
                </div>
              </div>
            </div>

            {/* Tela do Telegram (fundo) */}
            <div className="mt-20 bg-[#17212B] rounded-xl p-2 mx-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-[#FF7340] to-[#D93000] rounded-full flex items-center justify-center text-[8px]">🏷️</div>
                <p className="text-white text-[9px] font-semibold">CupomHoje</p>
              </div>
              {[1,2,3].map((i) => (
                <div key={i} className="bg-[#1E2D3A] rounded-lg p-1.5 mb-1.5">
                  <div className={`h-1.5 rounded-full mb-1 ${i===1?"w-3/4 bg-[#FF5A1F]/60":i===2?"w-1/2 bg-white/20":"w-2/3 bg-white/20"}`} />
                  <div className="h-1 rounded-full w-1/3 bg-white/10" />
                </div>
              ))}
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-3 pt-2">
            <div className="w-24 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <div className="bg-[#080808] min-h-screen text-white">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#080808]/90 backdrop-blur-xl px-5 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="CupomHoje" width={34} height={34} className="rounded-xl object-cover" />
            <span className="font-black text-base tracking-tight">CupomHoje</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={COMUNIDADE} target="_blank" rel="noopener noreferrer"
               className="hidden sm:flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors px-3 py-2">
              <TgIcon size={13} /> Comunidade
            </a>
            <a href={CANAL} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 bg-[#229ED9] hover:bg-[#1b90c8] text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <TgIcon size={14} /> Entrar no canal
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative px-5 pt-12 pb-8 overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#FF5A1F]/[0.05] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#229ED9]/[0.06] rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Texto */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#229ED9]/10 border border-[#229ED9]/25 text-[#229ED9] rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#229ED9] animate-pulse" />
                Canal oficial • Telegram
              </div>

              <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-5">
                Economize em<br />
                toda compra com<br />
                <span className="text-[#FF5A1F]">cupons no Telegram</span>
              </h1>

              <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Cupons verificados de +20 lojas chegam automaticamente no seu Telegram.
                Com preço original, desconto e link direto. Grátis, sem spam.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
                <a href={CANAL} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-center gap-2.5 bg-[#229ED9] hover:bg-[#1b90c8] active:scale-[0.97] text-white font-bold text-base px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-[#229ED9]/20">
                  <TgIcon size={20} /> Canal Oficial — Grátis
                </a>
                <a href={COMUNIDADE} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-center gap-2.5 bg-white/[0.06] hover:bg-white/10 active:scale-[0.97] text-white font-semibold text-base px-8 py-3.5 rounded-2xl transition-all border border-white/10">
                  <TgIcon size={20} /> Comunidade
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto lg:mx-0 pt-8 border-t border-white/[0.07]">
                {[
                  { v: "2 posts", l: "por dia no canal" },
                  { v: "100%",    l: "gratuito" },
                  { v: "20+",     l: "lojas parceiras" },
                ].map(({ v, l }) => (
                  <div key={l} className="text-center lg:text-left">
                    <div className="font-black text-xl text-[#FF5A1F]">{v}</div>
                    <div className="text-white/30 text-xs mt-0.5 leading-tight">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* iPhone mockup */}
            <div className="flex-shrink-0 w-64 lg:w-72">
              <PhoneMockup />
            </div>

          </div>
        </div>
      </section>

      {/* ── LOJAS COM DESCONTOS ── */}
      <section className="px-5 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[#FF5A1F] text-xs font-bold uppercase tracking-widest mb-1">Afiliados verificados</p>
              <h2 className="font-black text-2xl sm:text-3xl">Lojas com descontos</h2>
              <p className="text-white/35 text-sm mt-1">Clique e acesse com seu link de afiliado rastreado</p>
            </div>
            <a href={CANAL} target="_blank" rel="noopener noreferrer"
               className="text-[#FF5A1F] text-sm font-semibold hover:underline hidden sm:block shrink-0">
              Ver ofertas no canal →
            </a>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {LOJAS.map((loja) => (
              <a
                key={loja.nome}
                href={loja.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="group flex flex-col items-center text-center p-4 rounded-2xl border border-white/[0.06] hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.07] transition-all hover:-translate-y-0.5"
              >
                {/* Avatar com cor da marca */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3 shadow-lg"
                  style={{ backgroundColor: loja.cor + "22", border: `1.5px solid ${loja.cor}33` }}
                >
                  <span>{loja.emoji}</span>
                </div>

                <p className="font-bold text-white text-xs leading-tight mb-1">{loja.nome}</p>
                <p className="text-[10px] font-semibold mb-1" style={{ color: loja.cor }}>{loja.desc}</p>
                <p className="text-white/20 text-[9px]">{loja.cupons} oferta{loja.cupons > 1 ? "s" : ""}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="px-5 py-14">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#FF5A1F] text-xs font-bold uppercase tracking-widest mb-2">Simples assim</p>
            <h2 className="font-black text-2xl sm:text-3xl">Como funciona</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { n: "01", icon: "📲", title: "Entre no canal", desc: "Clique no botão e entre no canal oficial do CupomHoje. Sem cadastro, sem senha." },
              { n: "02", icon: "🔔", title: "Receba cupons", desc: "Toda manhã e tarde você recebe cupons com % de desconto, preço e link direto." },
              { n: "03", icon: "💰", title: "Economize", desc: "Clique no link, use o cupom e economize nas maiores lojas do Brasil." },
            ].map((s) => (
              <div key={s.n} className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-white/10 transition-colors">
                <span className="absolute top-4 right-4 font-black text-3xl text-white/[0.04]">{s.n}</span>
                <div className="w-12 h-12 bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 rounded-2xl flex items-center justify-center text-xl mb-4">{s.icon}</div>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-5 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-b from-[#229ED9]/10 via-[#FF5A1F]/5 to-transparent border border-white/[0.08] rounded-3xl p-10 sm:p-14">
            <div className="text-5xl mb-5">🏷️</div>
            <h2 className="font-black text-3xl sm:text-4xl mb-4">
              Próximos cupons chegam<br />
              <span className="text-[#229ED9]">em breve no canal</span>
            </h2>
            <p className="text-white/40 mb-8 leading-relaxed">
              Não perca as ofertas. Entre agora e economize nas suas próximas compras.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={CANAL} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center justify-center gap-2.5 bg-[#229ED9] hover:bg-[#1b90c8] text-white font-bold text-base px-9 py-4 rounded-2xl transition-all shadow-xl shadow-[#229ED9]/20">
                <TgIcon size={20} /> Canal Oficial — Grátis
              </a>
              <a href={COMUNIDADE} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center justify-center gap-2.5 bg-white/[0.05] hover:bg-white/10 text-white/70 font-semibold text-base px-9 py-4 rounded-2xl border border-white/10 transition-all">
                <TgIcon size={20} /> Comunidade
              </a>
            </div>
            <p className="mt-5 text-white/20 text-sm">Grátis · Sem spam · Saia quando quiser</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.05] px-5 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="CupomHoje" width={28} height={28} className="rounded-lg object-cover opacity-60" />
            <span className="font-bold text-sm text-white/30">CupomHoje</span>
          </div>
          <p className="text-white/15 text-xs text-center">
            © 2025 CupomHoje · Somos afiliados das lojas parceiras · Preços sujeitos a alteração
          </p>
          <div className="flex gap-5">
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
