import { LegalPageShell, LegalSection } from '../components/LegalPageShell';

export function Privacidade() {
  return (
    <LegalPageShell title="Política de Privacidade" updatedAtLabel="01/09/2026 (rascunho)">
      <LegalSection title="1. Quem controla seus dados">
        <p>
          O callout é operado por [razão social / CNPJ a definir — ver LAUNCH.md §3.3]. Enquanto essa estrutura não
          existe formalmente, trate esse controlador como a pessoa responsável pelo desenvolvimento do callout.
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados coletamos">
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong>Do Discord</strong> (no login): ID, nome de usuário e foto de avatar.</li>
          <li><strong>Da Riot</strong> (se você vincular, opt-in — §4 dos Termos): Riot ID (nome#tag), puuid, região, histórico de partidas e estatísticas.</li>
          <li><strong>Que você mesmo cria</strong>: nome de exibição e foto de perfil opcionais, estratégias, spots, imagens enviadas, recados, preferências de tema.</li>
          <li><strong>Técnicos</strong>: endereço IP e dados de acesso em log do servidor, cookie de sessão.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Por que coletamos e usamos">
        <p>
          Pra viabilizar o serviço em si (mostrar seu histórico, montar sua equipe, salvar suas estratégias) e pra
          manter a conta seguem (sessão de login, controle de acesso por equipe). O vínculo de conta Riot é sempre
          opt-in explícito.
        </p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <p>
          Dentro do callout, membros da <strong>mesma equipe</strong> veem uns dos outros: nome, estatísticas,
          função, estratégias e spots da equipe. Ninguém de fora da sua equipe tem acesso a esses dados pela
          ferramenta.
        </p>
        <p>Usamos os seguintes prestadores técnicos pra operar o serviço, cada um com acesso só ao que precisa pra sua função:</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong>Discord</strong> — autenticação (login);</li>
          <li><strong>HenrikDev API</strong> — fonte não-oficial do histórico de partidas da Riot;</li>
          <li><strong>Neon</strong> — hospedagem do banco de dados;</li>
          <li><strong>Railway</strong> — hospedagem da aplicação;</li>
          <li><strong>Sentry</strong> — monitoramento de erro técnico (sem dado de partida/conteúdo, só o necessário pra diagnosticar falhas).</li>
        </ul>
        <p>Não vendemos nem alugamos seus dados pra terceiros.</p>
      </LegalSection>

      <LegalSection title="5. Por quanto tempo guardamos">
        <p>Enquanto sua conta e sua equipe existirem. Ao excluir a equipe ou pedir exclusão da conta, os dados correspondentes são removidos — histórico de partida cacheado, estratégias e spots incluídos.</p>
      </LegalSection>

      <LegalSection title="6. Seus direitos (LGPD)">
        <p>Como titular dos dados, você pode a qualquer momento pedir:</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Confirmação de que tratamos seus dados, e acesso a eles;</li>
          <li>Correção de dado incompleto, inexato ou desatualizado;</li>
          <li>Anonimização, bloqueio ou eliminação de dado desnecessário ou tratado fora do previsto aqui;</li>
          <li>Portabilidade dos seus dados pra outro serviço;</li>
          <li>Informação sobre com quem compartilhamos seus dados (§4);</li>
          <li>Revogação do consentimento — por exemplo, desvincular sua conta Riot a qualquer momento.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Como exercer esses direitos">
        <p>[e-mail de contato a definir]. Vamos responder dentro de um prazo razoável.</p>
      </LegalSection>

      <LegalSection title="8. Segurança">
        <p>Sessão de login por cookie HttpOnly, tráfego criptografado (HTTPS) e acesso a dado de equipe restrito a quem é membro dela.</p>
      </LegalSection>

      <LegalSection title="9. Cookies e armazenamento local">
        <p>Usamos um cookie de sessão (obrigatório, pra manter você logado) e o armazenamento local do navegador (localStorage) pra lembrar preferências de interface, como tema claro/escuro e sidebar recolhida — isso fica só no seu navegador, não é enviado pra nós.</p>
      </LegalSection>

      <LegalSection title="10. Menores de idade">
        <p>O callout segue a classificação indicativa do próprio VALORANT. Não coletamos intencionalmente dado de menores fora dessa faixa sem consentimento apropriado.</p>
      </LegalSection>

      <LegalSection title="11. Alterações">
        <p>Podemos atualizar esta Política conforme o produto evolui. Mudanças relevantes serão avisadas dentro da ferramenta antes de entrarem em vigor.</p>
      </LegalSection>
    </LegalPageShell>
  );
}
