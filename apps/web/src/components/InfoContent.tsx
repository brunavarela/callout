import { Link } from 'react-router-dom';
import { LegalSection } from './LegalPageShell';

// Conteúdo de /sobre e /ajuda -- mesmo padrão de LegalContent.tsx
// (Termos/Privacidade), textos separados por serem mais "institucionais/
// suporte" do que jurídicos.
export function SobreContent() {
  return (
    <>
      <LegalSection title="Quem somos">
        <p>
          O callout foi desenvolvido por uma equipe comprometida com o desempenho, a melhoria contínua e a
          cooperação entre seus usuários. Nasceu de uma necessidade bem prática: jogadores de VALORANT que levam o
          jogo a sério, mas não tinham um lugar só deles pra estudar o próprio desempenho e organizar estratégia de
          equipe sem depender de planilha solta, print no Discord e memória.
        </p>
        <p>
          Acreditamos que evoluir no jogo fica mais fácil — e mais divertido — quando o time inteiro enxerga os
          mesmos números e trabalha em cima do mesmo plano. Por isso o callout junta as duas coisas num só lugar:
          histórico e estatística individual de verdade, e um espaço pra montar composição, desenhar estratégia por
          mapa e guardar aquele spot que sempre funciona.
        </p>
      </LegalSection>

      <LegalSection title="Como trabalhamos">
        <p>
          Construímos o produto aos poucos, prestando atenção em detalhe e ouvindo quem usa — grande parte do que
          existe hoje veio de feedback direto de jogadores testando o dia a dia. Se você tem uma sugestão, achou algo
          estranho ou só quer contar como está usando o callout, a gente quer ouvir (ver{' '}
          <Link to="/ajuda" style={{ color: 'var(--acc, #EF4958)' }}>
            Precisa de ajuda?
          </Link>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Independência">
        <p>
          O callout não é afiliado, endossado ou patrocinado pela Riot Games, Inc. — ver detalhes na{' '}
          <Link to="/termos" style={{ color: 'var(--acc, #EF4958)' }}>
            página de Termos de Uso
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}

export function AjudaContent() {
  return (
    <>
      <LegalSection title="Fale com a gente">
        <p>Tem alguma dúvida, sugestão ou passou por algum problema usando o callout? Escreva pra gente:</p>
        <p>
          <a href="mailto:brunavarela1@hotmail.com" style={{ color: 'var(--acc, #EF4958)', fontWeight: 600, fontSize: 16 }}>
            brunavarela1@hotmail.com
          </a>
        </p>
        <p>Respondemos todas as mensagens em até 24 horas.</p>
      </LegalSection>

      <LegalSection title="O que você pode nos mandar">
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Dúvidas sobre sua conta, sua equipe ou como alguma funcionalidade funciona;</li>
          <li>Bugs e comportamentos inesperados — quanto mais detalhe (o que você fez, o que esperava, o que aconteceu), mais rápido conseguimos resolver;</li>
          <li>Sugestões de melhoria ou de novas funcionalidades;</li>
          <li>Pedidos relacionados aos seus dados (correção, exportação ou exclusão de conta) — ver a{' '}
            <Link to="/privacidade" style={{ color: 'var(--acc, #EF4958)' }}>
              Política de Privacidade
            </Link>
            .
          </li>
        </ul>
      </LegalSection>
    </>
  );
}
