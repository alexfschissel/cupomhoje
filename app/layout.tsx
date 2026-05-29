import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cupomhoje.vercel.app"),
  title: "CupomHoje — Cupons grátis no Telegram",
  description:
    "Receba cupons verificados das maiores lojas do Brasil todo dia no Telegram. 100% grátis, sem spam.",
  openGraph: {
    title: "CupomHoje — Cupons grátis no Telegram",
    description: "Cupons verificados das melhores lojas, todo dia no seu Telegram.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="lomadee" content="2324685" />
        {/* AWIN Publisher MasterTag — converte links em afiliados rastreados */}
        <script src="https://www.dwin2.com/pub.2909655.min.js" defer async></script>
      </head>
      <body className="bg-[#0A0A0A] text-white antialiased">{children}</body>
    </html>
  );
}
