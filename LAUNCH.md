# callout — plano de lançamento público

> Documento de handoff de **produto/negócio**. Registra a decisão da Bruna
> (31/08/2026) de tirar o callout do grupo fechado de amigos e abrir pro
> público, com monetização prevista ~2 meses depois do ar. Para arquitetura
> técnica atual ver [CONTEXT.md](CONTEXT.md), para estado de implementação
> ver [PROGRESS.md](PROGRESS.md).
>
> Este documento é um ponto de partida informado, não uma sentença — se
> algo aqui não fizer mais sentido durante o trabalho, ajuste e siga.

---

## 1. A visão

- **Time é o diferencial.** O app mostra números individuais, mas o produto
  que a Bruna quer construir é focado em **equipe**: montar time, definir
  função, desenhar estratégia por mapa, salvar spots/lineups. Isso precisa
  funcionar perfeitamente — é o que diferencia de qualquer tracker de stats
  genérico.
- **Grátis no lançamento.** Sem cobrança nos primeiros ~2 meses no ar, pra
  ganhar tração e feedback real.
- **Monetização depois:** plano **PRO** mensal (R$ 19,90/mês, valor de
  referência) libera **Time, Estratégia (Board) e Spots**. Dashboard
  individual continua grátis. Possibilidade futura de anúncios também
  cogitada, não decidida.
- **Trabalho feito na branch `dev`** enquanto essa frente não está pronta
  pra produção. `main` continua sendo o que está no ar hoje (grupo fechado).

---

## 2. Por que isto não é só "trocar uma flag" — gaps reais encontrados no código

Revisão feita em 31/08/2026 contra o estado atual do repo. Isto muda o
cálculo de esforço: **não é lançar o que já existe pro público**, é
**mudar premissas estruturais** que foram decisões corretas pra "10 amigos"
e viram bloqueios pra "produto público".

| # | Gap | Onde | Por que bloqueia lançamento público |
|---|---|---|---|
| 1 | **Um único time, hardcoded** | `apps/api/src/lib/team.ts:15` — `prisma.team.findFirst()` cria o time na primeira vez e depois sempre reusa **o único time que existir no banco**. Todo usuário novo entra automaticamente nesse mesmo time. | Com usuários públicos desconhecidos, o segundo usuário cadastrado cairia dentro do time (e veria as estratégias/spots) do primeiro. Isto é a diferença entre "não tem multi-tenancy porque não precisa" (CONTEXT.md §1, correto pra 10 amigos) e "vaza dado de um grupo pro outro" (inaceitável em produto público). |
| 2 | **Spots são globais** | PROGRESS.md, Fase 4 — `GET /spots` não filtra por time porque `Spot` não tem `teamId` no schema. | Mesmo problema do #1: qualquer usuário logado vê spot de qualquer outro time. |
| 3 | **Login exige pertencer a um servidor Discord específico** | `apps/api/src/routes/auth.ts` → `findGuildMembership()` (`apps/api/src/lib/discord.ts`) | É o controle de acesso do grupo fechado (CONTEXT.md §6.1). Precisa virar cadastro aberto — Discord OAuth continua ótimo como login, só sem o allowlist de servidor. |
| 4 | **Dado de partida vem de API não-oficial (HenrikDev)** | CONTEXT.md §5.1–5.2 | Tem rate limit por tier de chave, pode quebrar a qualquer patch, e o acesso foi pensado pro volume de ~10 usuários. Produto público muda o volume por uma ordem de grandeza ou mais. |
| 5 | **Chave oficial da Riot foi descartada por ser "app fechado"** | CONTEXT.md §5.1 | O motivo documentado pra não perseguir RSO/chave de produção foi justamente "site fechado pra 10 amigos é o perfil recusado". **Isso muda com o produto público** — vale reabrir essa conversa com a Riot (ver §5 abaixo). |
| 6 | **Nome do produto/domínio não pode citar "Valorant"** | CONTEXT.md §10.2 | Já era regra pro fechado, continua valendo (e fica mais visível/exposta a risco legal) pro público. |
| 7 | **Sem monitoramento de erro/observabilidade** | não há menção em PROGRESS.md | Com 10 amigos, bug some com um "ei, deu erro aqui" no Discord. Com público desconhecido, bug silencioso = usuário que só vai embora. |

---

## 3. Jurídico e marca

⚠️ **Não sou advogada nem contadora — o que segue é um checklist do que
precisa ser verificado/decidido, não parecer jurídico.** Vale confirmar com
profissional antes de cobrar de fato.

- [ ] **Nome/domínio**: escolher algo sem "Valorant"/marcas da Riot (regra já
      documentada, CONTEXT.md §10.2). Verificar disponibilidade de domínio
      e, se possível, checar se não colide com marca já registrada no INPI.
- [ ] **Pessoa jurídica**: pra emitir nota fiscal e receber assinatura
      recorrente de forma legal no Brasil, provavelmente precisa de MEI ou
      ME (CNPJ). Decidir se já existe alguma estrutura ou se abre uma nova.
- [ ] **Termos de uso + Política de privacidade**: obrigatório antes de
      abrir cadastro público. Precisa cobrir LGPD (dado pessoal: Discord ID,
      Riot ID, e-mail se houver, IP).
- [ ] **Disclaimer de não afiliação com a Riot Games** — já previsto em
      CONTEXT.md §10.4, agora deixa de ser hipotético.
- [ ] **Opt-in explícito de compartilhamento de dado de partida** — idem,
      §10.4. O usuário precisa consentir que os dados da conta Riot dele
      sejam puxados e mostrados (inclusive pro time dele).
- [ ] **⚠️ Política de monetização da Riot Games / HenrikDev** — **não
      verificado ainda, verificar antes de ligar cobrança.** APIs de jogo
      costumam ter cláusulas restringindo cobrar dinheiro em cima de dado
      derivado do jogo sem aprovação. Isso vale tanto pra eventual chave
      oficial da Riot (Developer Portal tem uma seção de política de uso/
      monetização) quanto pros termos da HenrikDev (API não-oficial —
      conferir se ela permite uso comercial/redistribuição paga). Achar essa
      resposta **antes** de aceitar o primeiro pagamento, não depois.

---

## 4. Arquitetura — o que muda antes de abrir pro público

Ordem sugerida (cada item destrava o próximo):

1. **Multi-tenancy real de time**
   - Criar time deixa de ser automático-no-primeiro-login; usuário cria um
     time ou entra num via convite (código/link).
   - `Spot` ganha `teamId` (migration) e `GET /spots` filtra por time do
     usuário logado.
   - Revisar todo lugar que hoje faz `team.findFirst()` — não é só
     `team.ts`, conferir `sync.ts`/`match-result.ts` também (retornaram na
     busca por "guild" mas por coincidência de palavra — confirmar se usam
     o mesmo padrão de time único antes de mexer).
2. **Auth aberta**
   - Tirar o `findGuildMembership()` do fluxo obrigatório de login, ou
     transformar em allowlist opcional por time (dono do time pode restringir
     quem entra, mas isso não é mais controle de acesso da plataforma
     inteira).
3. **Decisão sobre fonte de dado de partida**
   - Curto prazo: continuar HenrikDev, mas checar tier de rate limit
     necessário pro volume esperado e ter plano de fallback (fila,
     backoff, mensagem clara de "sincronização atrasada" em vez de tela
     quebrada).
   - Médio prazo: reabrir pedido de chave de produção oficial da Riot
     (RSO) agora que existe produto público de verdade — CONTEXT.md §5.1
     documentava a recusa esperada especificamente pro caso de app
     fechado, que deixa de valer.
4. **Observabilidade mínima**: error tracking (ex.: Sentry free tier) e log
   estruturado antes de aceitar tráfego desconhecido.
5. **Paywall técnico** (só depois que 1–4 estiverem de pé):
   - Campo de plano/assinatura no usuário ou tabela `subscriptions`
     (status, `currentPeriodEnd`, gateway, `externalId`).
   - Middleware/guard nas rotas de `team`, `strategies`, `spots` que
     verifica plano PRO ativo.
   - Dashboard individual (KPIs, histórico, rank) continua sem guard —
     é o gancho grátis que atrai gente pro produto.

---

## 5. Pagamento

- **Gateway**: Mercado Pago (PIX/boleto, forte no Brasil) vs Stripe
  (cartão internacional, mais familiar pra devs, exige conta e KYC) — a
  Bruna decide, cada um tem trade-off de taxa/UX/burocracia de abertura.
- Assinatura recorrente mensal, R$ 19,90 de referência, cancelamento
  self-service (usuário não deveria precisar pedir por Discord/e-mail pra
  cancelar).
- Anúncios: cogitado como fonte extra de receita, não decidido ainda
  (rede — AdSense? — e onde entrariam na UI ficam em aberto).

---

## 6. Infra e deploy

- Hoje: Railway (produção) + Neon Postgres (branch `production` separado
  do `dev`, ver memória do projeto sobre o estouro de cota de agosto/2026).
  Confirmar se o plano atual do Railway aguenta tráfego público (tiers
  free/hobby costumam ter limite de horas/RAM) antes do lançamento amplo.
- Domínio: comprar e apontar DNS pro Railway (API) e onde o front for
  servido.
- Todo o trabalho desta frente (multi-tenancy, auth aberta, paywall) fica
  na branch `dev` até estar validado — só depois vai pra `main`/produção.

---

## 7. Fases (sequência, não data fixa)

| Fase | Escopo | Cobra? |
|---|---|---|
| **A — Fundação pro público** | §4 inteiro (multi-tenancy, auth aberta, decisão de dado, observabilidade) + §3 (jurídico/domínio/termos) | não |
| **B — Soft launch** | Cadastro aberto mas divulgação pequena/controlada, pra pegar bug real com usuário desconhecido antes de divulgar largo | não |
| **C — Divulgação ampla** | Marketing de verdade, comunidade Valorant, etc. | não |
| **D — Liga monetização** (~2 meses depois de B) | Paywall técnico (§4.5) + gateway de pagamento (§5) ativos. Time/Estratégia/Spots viram PRO; individual continua grátis | **sim** |
| **E — Anúncios** (opcional, sem data) | Só se fizer sentido depois de D rodando | sim (indireto) |

---

## 8. Perguntas em aberto (só a Bruna decide)

- Nome/domínio candidato?
- Mercado Pago ou Stripe (ou os dois)?
- Já existe CNPJ/MEI, ou abre um novo pra isso?
- Heatmap e comentários ficam grátis (junto do individual) ou entram no
  PRO junto de Time/Estratégia/Spots?
- Meta de usuários pro soft launch (fase B) antes de abrir geral (fase C)?
- R$ 19,90/mês é preço final ou placeholder pra validar depois?
