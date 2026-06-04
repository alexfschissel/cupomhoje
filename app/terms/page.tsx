import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — CupomHoje",
  description: "Termos de Uso do canal CupomHoje no Telegram",
};

export default function TermsPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900 px-6 py-12">
      <article className="max-w-3xl mx-auto prose prose-lg">
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-gray-500 mb-8">Última atualização: 04 de junho de 2026</p>

        <h2 className="text-xl font-bold mt-8 mb-3">1. Aceitação</h2>
        <p>
          Ao acessar o canal CupomHoje (@cupomhojeoficial) no Telegram, você concorda com estes
          Termos de Uso e nossa <a href="/privacy" className="text-blue-600 underline">Política de Privacidade</a>.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">2. Sobre o Serviço</h2>
        <p>
          O CupomHoje é um serviço gratuito de divulgação de cupons e descontos. Atuamos como
          afiliados das lojas parceiras e recebemos comissão por vendas geradas a partir de
          nossos links.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">3. Responsabilidades</h2>
        <p>O CupomHoje:</p>
        <ul className="list-disc pl-6 my-3 space-y-1">
          <li>NÃO se responsabiliza por entregas, qualidade ou problemas de produtos</li>
          <li>NÃO armazena ou processa pagamentos</li>
          <li>Apenas DIVULGA ofertas e cupons das lojas parceiras</li>
          <li>Preços e disponibilidade podem variar — confira sempre na loja</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">4. Limitação de Responsabilidade</h2>
        <p>
          Não nos responsabilizamos por:
        </p>
        <ul className="list-disc pl-6 my-3 space-y-1">
          <li>Alterações de preço entre o momento da publicação e da compra</li>
          <li>Cupons expirados ou indisponíveis</li>
          <li>Problemas com entrega ou qualidade dos produtos</li>
          <li>Atrasos no envio ou troca de produtos</li>
          <li>Conteúdo ou políticas das lojas parceiras</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">5. Conduta</h2>
        <p>Como membro do canal, você se compromete a:</p>
        <ul className="list-disc pl-6 my-3 space-y-1">
          <li>Não divulgar conteúdo ofensivo</li>
          <li>Não fazer spam ou divulgar concorrência</li>
          <li>Respeitar outros membros</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">6. Direitos Autorais</h2>
        <p>
          Os logotipos, marcas e imagens de lojas e produtos pertencem aos seus respectivos
          proprietários. Utilizamos apenas para fins de divulgação das ofertas.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">7. Modificações</h2>
        <p>
          Estes termos podem ser alterados a qualquer momento. Recomendamos verificar
          periodicamente.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">8. Contato</h2>
        <p>
          Para dúvidas sobre estes termos, entre em contato pelo canal
          (<a href="https://t.me/cupomhojeoficial" className="text-blue-600 underline">@cupomhojeoficial</a>).
        </p>

        <hr className="my-12" />
        <p className="text-sm text-gray-500 text-center">
          © 2026 CupomHoje · Operamos como afiliados de redes de marketing
        </p>
      </article>
    </div>
  );
}
