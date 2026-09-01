import { LegalPageShell, LegalSection } from '../components/LegalPageShell';

export function Termos() {
  return (
    <LegalPageShell title="Termos de Uso" updatedAtLabel="01/09/2026 (rascunho)">
      <LegalSection title="1. O que é o callout">
        <p>
          O callout é uma ferramenta independente de análise de desempenho e planejamento de estratégia pra times de
          VALORANT — histórico e estatísticas individuais, montagem de equipe, quadro de estratégia por mapa e
          spots/lineups.
        </p>
        <p>
          O callout <strong>não é afiliado, endossado ou patrocinado pela Riot Games, Inc.</strong> Nomes de agentes,
          mapas, modos de jogo e demais elementos do VALORANT exibidos na ferramenta pertencem à Riot Games e
          aparecem aqui só como conteúdo — não como identidade do produto.
        </p>
      </LegalSection>

      <LegalSection title="2. Aceitação">
        <p>Ao criar uma conta ou usar o callout, você concorda com estes Termos e com a nossa Política de Privacidade. Se não concordar, não use o serviço.</p>
      </LegalSection>

      <LegalSection title="3. Cadastro e conta">
        <p>
          Login é feito via Discord OAuth2 (não usamos senha própria). Cada conta pertence a uma única equipe por vez
          — você entra criando uma equipe nova ou usando um código de convite de uma equipe existente.
        </p>
        <p>Você é responsável por manter sua conta do Discord segura — qualquer atividade feita a partir dela é considerada sua.</p>
      </LegalSection>

      <LegalSection title="4. Vínculo com sua conta Riot">
        <p>
          <strong>O callout nunca pede seu usuário e senha da Riot.</strong> O vínculo é feito informando seu Riot ID
          (formato nome#tag) — a partir daí buscamos e exibimos seu histórico de partidas.
        </p>
        <p>
          Esse dado vem de uma API pública não-oficial (HenrikDev), sem afiliação com a Riot Games. Ela pode
          apresentar instabilidade, atraso na sincronização ou parar de funcionar sem aviso prévio — não garantimos
          disponibilidade nem exatidão total desse dado.
        </p>
        <p>Vincular sua conta Riot é opcional e é um opt-in explícito: ao vincular, você concorda que seus dados de partida fiquem visíveis pros demais membros da sua equipe dentro da ferramenta.</p>
      </LegalSection>

      <LegalSection title="5. Uso aceitável">
        <p>Ao usar o callout, você concorda em não:</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Usar a ferramenta pra obter vantagem em tempo real durante uma partida em andamento;</li>
          <li>Tentar acessar dados de outra equipe além da sua, ou burlar os controles de acesso da plataforma;</li>
          <li>Enviar conteúdo (imagens, texto) ofensivo, ilegal ou que viole direito de terceiros;</li>
          <li>Usar o serviço de forma que sobrecarregue ou prejudique sua disponibilidade pra outros usuários.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Conteúdo que você envia">
        <p>
          Estratégias, spots, imagens e comentários que você cria no callout continuam seus — ao publicá-los, você
          autoriza a exibição desse conteúdo pros demais membros da sua equipe dentro da ferramenta. Você é
          responsável pelo que envia.
        </p>
      </LegalSection>

      <LegalSection title="7. Planos e cobrança">
        <p>
          O dashboard individual (histórico, estatísticas pessoais) é gratuito permanentemente. Os recursos de
          equipe (Time, Estratégia, Spots) são gratuitos no lançamento e passam a fazer parte de um plano pago
          (PRO) depois de um período inicial — cobrança e valor exato serão comunicados com antecedência antes de
          entrarem em vigor pra qualquer conta.
        </p>
        <p>Assinaturas, quando existirem, poderão ser canceladas a qualquer momento pelo próprio usuário, sem multa.</p>
      </LegalSection>

      <LegalSection title="8. Propriedade intelectual">
        <p>
          O nome "callout", a marca e o código da ferramenta pertencem aos seus desenvolvedores. Conteúdo de jogo
          (nomes, artes, ícones do VALORANT) pertence à Riot Games e é usado aqui sob o entendimento de conteúdo
          gerado a partir de API pública, não como marca própria.
        </p>
      </LegalSection>

      <LegalSection title="9. Isenção de garantias">
        <p>
          O callout é fornecido "como está". Por depender de uma API de dado não-oficial (§4), não garantimos que o
          histórico de partidas esteja sempre correto, completo ou disponível. Não nos responsabilizamos por
          decisões tomadas com base nos dados exibidos.
        </p>
      </LegalSection>

      <LegalSection title="10. Encerramento">
        <p>Você pode sair da sua equipe ou pedir a exclusão da sua conta a qualquer momento. Podemos suspender contas que violem estes Termos, especialmente a regra de uso aceitável (§5).</p>
      </LegalSection>

      <LegalSection title="11. Alterações">
        <p>Podemos atualizar estes Termos conforme o produto evolui. Mudanças relevantes serão avisadas dentro da ferramenta antes de entrarem em vigor.</p>
      </LegalSection>

      <LegalSection title="12. Lei aplicável">
        <p>Estes Termos são regidos pelas leis do Brasil.</p>
      </LegalSection>

      <LegalSection title="13. Contato">
        <p>Dúvidas sobre estes Termos: [e-mail de contato a definir].</p>
      </LegalSection>
    </LegalPageShell>
  );
}
