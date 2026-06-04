import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — CupomHoje",
  description: "Política de Privacidade do canal CupomHoje no Telegram",
};

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900 px-6 py-12">
      <article className="max-w-3xl mx-auto prose prose-lg">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-8">Última atualização: 04 de junho de 2026</p>

        <h2 className="text-xl font-bold mt-8 mb-3">1. Sobre o CupomHoje</h2>
        <p>
          O CupomHoje é um canal informativo no Telegram (@cupomhojeoficial) que compartilha
          cupons e descontos de lojas online parceiras. Operamos como afiliados de redes como
          AWIN, AliExpress, Lomadee, Amazon Associates e outras.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">2. Informações que coletamos</h2>
        <p><strong>Não coletamos dados pessoais diretamente</strong>. O CupomHoje:</p>
        <ul className="list-disc pl-6 my-3 space-y-1">
          <li>Não exige cadastro</li>
          <li>Não solicita email, telefone ou CPF</li>
          <li>Não armazena dados de navegação dos usuários do canal</li>
          <li>Não utiliza cookies de rastreamento próprios</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">3. Links de Afiliados</h2>
        <p>
          Os links de produtos publicados no canal são links de afiliados. Ao clicar e finalizar
          uma compra, recebemos comissão das lojas parceiras. Você não paga nada a mais por isso.
        </p>
        <p>
          As lojas parceiras (Amazon, AliExpress, Shopee, LG, Kabum, etc.) possuem suas próprias
          políticas de privacidade que regem o tratamento de seus dados quando você acessa seus sites.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">4. Telegram</h2>
        <p>
          O canal é hospedado no Telegram, que possui sua própria Política de Privacidade
          (<a href="https://telegram.org/privacy" className="text-blue-600 underline">telegram.org/privacy</a>).
          Não temos acesso aos dados pessoais dos membros do canal.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">5. Publicidade</h2>
        <p>
          Utilizamos a plataforma Meta Ads (Facebook/Instagram) para divulgar o canal. A Meta
          pode coletar dados de navegação conforme sua própria Política de Privacidade
          (<a href="https://www.facebook.com/privacy/policy" className="text-blue-600 underline">facebook.com/privacy/policy</a>).
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">6. Direitos do Usuário</h2>
        <p>
          Como não coletamos dados pessoais, não há solicitações de exclusão de dados a serem
          processadas. Para sair do canal, basta usar a opção &ldquo;Sair do Canal&rdquo; no Telegram.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">7. Alterações nesta Política</h2>
        <p>
          Esta política pode ser atualizada ocasionalmente. A data da última atualização será
          alterada no topo da página.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">8. Contato</h2>
        <p>
          Para dúvidas sobre privacidade, entre em contato pelo canal
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
