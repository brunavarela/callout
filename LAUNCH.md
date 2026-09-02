# callout — plano de lançamento público

> Documento de handoff de **produto/negócio**. Registra a decisão da Bruna
> (31/08/2026) de tirar o callout do grupo fechado de amigos, abrir pro
> público e monetizar (plano PRO) ~2 meses depois do ar. Varredura completa
> — técnico, jurídico, produto, infra, divulgação. Para arquitetura técnica
> atual ver [CONTEXT.md](CONTEXT.md), pra estado de implementação ver
> [PROGRESS.md](PROGRESS.md).
>
> Ponto de partida informado, não uma sentença — se algo aqui não fizer mais
> sentido durante o trabalho, ajuste e siga.

---

## 1. A visão

- **Time é o diferencial.** Números individuais existem, mas o produto é
  focado em **equipe**: montar time, função, estratégia por mapa, spots.
  Essa parte precisa funcionar perfeitamente — é o que diferencia de
  qualquer tracker de stats genérico.
- **Grátis no lançamento.** Sem cobrança nos primeiros ~2 meses no ar.
- **Monetização depois:** plano **PRO** mensal (R$ 19,90/mês, valor de
  referência) libera **Time, Estratégia (Board) e Spots**. Dashboard
  individual continua grátis. Anúncios cogitados como receita extra, não
  decidido.
- **Trabalho técnico roda na branch `dev`** enquanto essa frente não está
  pronta pra produção; `main` continua sendo o que está no ar hoje.

---

## 2. O que muda de "ferramenta de 10 amigos" pra "produto público" — gaps técnicos reais

Revisão contra o código atual (31/08/2026):

| # | Gap | Onde | Por que bloqueia lançamento público |
|---|---|---|---|
| 1 | **Um único time, hardcoded** | `apps/api/src/lib/team.ts:15` — `prisma.team.findFirst()` sempre pega/cria **o único time que existir**. Todo usuário novo entra automaticamente nele. | Usuário público desconhecido cairia dentro do time (e veria estratégias/spots) de outro grupo qualquer. Vazamento de dado entre contas — inaceitável em produto público, mesmo sendo a decisão certa pra "10 amigos" (CONTEXT.md §1). |
| 2 | **Spots são globais** | `Spot` não tem `teamId` no schema (PROGRESS.md, Fase 4) | Mesmo problema do #1: qualquer usuário logado vê spot de qualquer time. |
| 3 | **Login exige pertencer a um servidor Discord específico** | `findGuildMembership()` em `apps/api/src/lib/discord.ts`, chamado em `apps/api/src/routes/auth.ts` | É o controle de acesso do grupo fechado. Precisa virar cadastro aberto (Discord OAuth sem allowlist obrigatório de servidor). |
| 4 | **Dado de partida vem de API não-oficial (HenrikDev)** | CONTEXT.md §5.1–5.2 | Rate limit por tier de chave, pode quebrar a qualquer patch, pensada pro volume de ~10 usuários. |
| 5 | **Sem monitoramento de erro/observabilidade** | não há menção em PROGRESS.md | Com público desconhecido, bug silencioso = usuário que só vai embora, sem ninguém saber. |

---

## 3. Jurídico e compliance — varredura completa

⚠️ **Não sou advogada nem contadora.** O que segue é um mapa do que precisa
ser resolvido e, onde consegui, a resposta verificada com fonte — não
substitui revisão por profissional antes de operar de fato (principalmente
antes de emitir a primeira cobrança).

### 3.1 Política da Riot Games — **verificado agora, isso muda o plano**

Fui checar direto na fonte (`developer.riotgames.com`) em vez de deixar como
suposição. Achados:

- **Chave de VALORANT: só produção, não tem "chave pessoal".** Citação
  literal da doc: *"Personal Key Applications are currently not supported."*
  Pra pedir a de produção: registrar o produto no Developer Portal, integrar
  **RSO** (Riot Sign On) pro opt-in do jogador, e o caso de uso ser aprovado.
- **App fechado/pessoal é explicitamente recusado**: a doc lista, como caso
  de uso não aprovado, *"Apps that are not public and are designed for
  personal use only"*. **Isso deixa de ser o caso do callout assim que ele
  vira produto público** — o motivo documentado em CONTEXT.md §5.1 pra não
  perseguir esse caminho some com essa mudança de plano.
- **Monetização é permitida, com condições claras:**
  - Precisa ter **camada grátis** (*"You must have a free tier of access
    for players, which may include advertising"*) — bate com a decisão de
    manter o dashboard individual sempre grátis.
  - O que é cobrado precisa ser **"transformative"** (agregar informação/
    estética/entendimento novo sobre o dado bruto) — Time, Estratégia e
    Spots se encaixam bem aqui: não é só mostrar stat, é o usuário criando
    conteúdo próprio (composição de time, desenho de jogada, anotação de
    spot) em cima do dado.
  - Métodos aceitos incluem explicitamente **assinatura**.
  - Precisa registrar o produto no Developer Portal e ter status
    *Approved* ou *Acknowledged* antes de monetizar.
  - Proibido: apostas/gambling, monetização "unfair"/abusiva.
- **Preferência declarada por fonte de dado oficial**: a política diz que
  produtos devem usar os serviços suportados pela Riot pra ingestão de
  dado — reforça que vale migrar de HenrikDev pra API oficial assim que o
  produto for público, não só por robustez técnica mas por estar dentro da
  política.
- **Marca/branding**: uso de logo/marca da Riot só onde for "inevitável pro
  valor central do produto", e o produto não pode se parecer visualmente/
  funcionalmente com os jogos da Riot. Precisa do aviso de não-afiliação
  (já previsto em CONTEXT.md §10.4). Regra de não usar "Valorant" no nome
  do produto/domínio (CONTEXT.md §10.2) continua valendo — a política não
  entra em detalhe sobre nome/domínio, mas é prudente manter a regra.

  Fontes: [Riot Games Developer Policies (geral)](https://developer.riotgames.com/policies/general),
  [VALORANT — Riot Developer Portal](https://developer.riotgames.com/docs/valorant).

- [ ] **Ação decorrente**: registrar o callout no Riot Developer Portal e
      abrir o processo de chave de produção + RSO assim que a Fase A
      (arquitetura pública) estiver perto do fim — não precisa esperar o
      produto estar 100% pronto, o processo de aprovação da Riot pode
      demorar e pode rodar em paralelo.

### 3.2 HenrikDev (API não-oficial) — **não achei um ToS formal claro**

Busquei um termo de uso comercial explícito da HenrikDev e não encontrei um
documento dedicado com essa cláusula — a doc (`docs.henrikdev.xyz`) deixa
claro que não é afiliada à Riot, mas não achei texto específico permitindo
ou proibindo uso comercial/monetização em cima da API. **Não dá pra tratar
isso como "liberado" nem como "proibido" — a única forma confiável de saber
é perguntar direto pro mantenedor (Discord/e-mail `contact@henrikdev.xyz`,
conforme a doc) antes de cobrar algo que dependa desse dado.** Isso reforça
o item anterior: migrar pra API oficial da Riot resolve essa incerteza de
uma vez.

### 3.3 Estrutura jurídica (pessoa jurídica) para receber assinatura

- **MEI**: teto de faturamento **R$ 81.000/ano** (~R$ 6.750/mês), valor em
  vigor desde 2018 (fonte: [Contabilizei, dados 2026](https://www.contabilizei.com.br/contabilidade-online/faturamento-mei-2026/)).
  Ultrapassar até 20% (até R$ 97.200/ano) ainda permite continuar até
  dezembro daquele ano, com DAS complementar. Em R$ 19,90/mês, o teto do
  MEI cobre até ~340 assinantes simultâneos — folgado pro início, mas é um
  número pra ter em mente se o produto crescer rápido (nesse caso migrar
  pra ME/CNPJ normal).
  - MEI não permite CNAE de "desenvolvimento de programas de computador sob
    encomenda" de forma ampla — verificar com contador se o CNAE de SaaS/
    aplicativo se encaixa nas atividades permitidas pro MEI ou se precisa
    já nascer como ME.
- **Decisão prática**: se já existe algum CNPJ (MEI ou outro) que a Bruna
  possa usar, provavelmente é o caminho mais rápido/barato pra começar.
  Senão, abrir MEI é gratuito e rápido (portal gov.br) — mas **fazer essa
  abertura só precisa acontecer antes da Fase D (cobrança)**, não antes.
- [ ] **Verificar com contador**: CNAE correto, se MEI aguenta o modelo de
      negócio (SaaS com assinatura recorrente + eventual publicidade), e
      regra de emissão de nota fiscal por assinatura recorrente.

### 3.4 LGPD e termos legais

- **Política de Privacidade** e **Termos de Uso** obrigatórios antes de
  abrir cadastro público — cobrindo: quais dados são coletados (Discord ID,
  e-mail se houver, Riot ID/puuid, histórico de partidas, IP), pra que
  servem, por quanto tempo ficam guardados, como o usuário pode pedir
  exclusão (direito da LGPD).
- **Disclaimer de não afiliação com a Riot Games** — CONTEXT.md §10.4 já
  previa, agora deixa de ser hipotético.
- **Opt-in explícito** de vínculo de conta Riot e de compartilhamento do
  próprio dado de partida com o time (idem §10.4) — e isso também é
  **requisito técnico da Riot** pro RSO (§3.1), não só boa prática.
- **Cancelamento de assinatura self-service**: regra de proteção ao
  consumidor no Brasil vem endurecendo sobre cancelamento de assinatura
  digital ter que ser tão fácil quanto a contratação — não deixar isso
  depender de pedir por Discord/e-mail.
- [ ] **Verificar com advogado**: se o volume justifica registrar
      "encarregado" (DPO) formal (LGPD art. 41) ou se, no tamanho inicial,
      um canal de contato já basta; texto final de Termos/Privacidade.

### 3.5 Publicidade (se for usada)

- Redes tipo Google AdSense exigem site com conteúdo próprio suficiente,
  política de privacidade publicada e, em geral, alguns meses de operação
  antes de aprovar — não é algo pra ativar no dia 1.
- Anúncio em cima de dado da Riot precisa respeitar a mesma política do
  §3.1 (camada grátis pode ter anúncio, mas sem gambling/promoção
  inadequada).

---

## 4. Produto — grátis vs PRO

- **Grátis, pra sempre**: dashboard individual (KPIs, histórico, evolução
  de rank, winrate por mapa/agente).
- **PRO (R$ 19,90/mês, referência)**: Time, Estratégia (Board), Spots.
- ✅ **Resolvido (02/09/2026):** Heatmap e Comentários **não fazem parte do
  lançamento** — já tinham sido removidos do produto antes (histórico,
  ver PROGRESS.md), decisão reconfirmada agora. Não entram nem no grátis
  nem no PRO por ora; questão de escopo PRO fica só entre Equipe/
  Estratégia/Spots.
- **Em aberto** (ver §11): preço final (R$19,90) ou placeholder?

---

## 5. Arquitetura técnica necessária

Ordem sugerida — cada item destrava o próximo:

1. ✅ **Multi-tenancy real de equipe** (feito 2026-09-01) — criar equipe
   deixou de ser automático no primeiro login; usuário cria uma equipe ou
   entra via convite (código). `Spot` ganhou `equipeId`. Todo
   `team.findFirst()` foi substituído por resolução via `MembroEquipe` do
   usuário logado. Rename completo "Time"→"Equipe" em todo o código nesse
   meio-tempo (pedido à parte); permissões de admin, cargo (jogador/
   treinador) e a página `/equipe/configuracoes` também saíram do papel —
   ver §12 abaixo e a memória do projeto.
2. ✅ **Auth aberta** (feito 2026-09-01) — `findGuildMembership()` saiu do
   fluxo (scope OAuth caiu pra só `identify`, `DISCORD_GUILD_ID` não é mais
   exigido). Controle de acesso virou por equipe — código de convite — em
   vez de plataforma inteira. Confirmado que `resolveDashboardTarget` nunca
   dependeu do Discord: dashboard de outro usuário só é visível se ele for
   da mesma equipe, isso não mudou. Código de convite passou a só ir pro
   admin (`GET /equipe` zera o campo pra quem não é — proteção no backend,
   não só a UI escondendo), com botão de olhinho pra mostrar/esconder.
3. **Migração de fonte de dado** (ver §3.1): abrir processo de chave de
   produção Riot + RSO em paralelo ao resto; manter HenrikDev como fallback
   até a chave oficial sair, com fila/backoff e mensagem clara de
   "sincronização atrasada" em vez de tela quebrada.
4. ✅ **Observabilidade mínima** (feito 2026-09-01) — `@sentry/node` no
   backend (`Sentry.setupFastifyErrorHandler`) e `@sentry/react` no front
   (`ErrorBoundary` com fallback amigável). `SENTRY_DSN`/`VITE_SENTRY_DSN`
   opcionais — sem DSN é no-op dos dois lados, só captura de verdade quando
   alguém criar os projetos gratuitos no sentry.io e colar o DSN no `.env`.
5. **Paywall técnico** (só depois de 1–4 de pé): campo de plano/assinatura
   no usuário ou tabela `subscriptions` (status, `currentPeriodEnd`,
   gateway, `externalId`); guard nas rotas de `team`/`strategies`/`spots`.
6. **Login sem depender do Discord** — ver §5.1 abaixo. Especificado,
   ainda não implementado (RSO está bloqueado pela Riot; e-mail é decisão
   em aberto).

### 5.1 Login sem Discord — spec pronta pra quando decidirmos tocar

Discutido em 2026-09-01: Discord como único jeito de entrar exclui gente que
joga sério, tem time, mas nunca abriu conta lá. Dois caminhos, não
excludentes:

**a) E-mail + código de uso único** (curto prazo, não depende de ninguém
externo). Quem autentica de verdade é o e-mail — o código só prova posse da
caixa de entrada. Riot ID continua vinculado depois exatamente como hoje
(campo `nome#tag`, validado na HenrikDev). Custo real de implementar:
provedor de e-mail transacional (Resend/Postmark), configurar domínio/DKIM
pra não cair em spam, rate-limit no envio do código pra evitar abuso.

**b) "Entrar com a Riot" (RSO)** — o pedido desta conversa. RSO é o OAuth2
oficial da Riot: resolve login **e** o opt-in de compartilhamento de dado
que a política exige (§3.1) na mesma tela, sem precisar do passo manual de
"digite seu Riot ID" — a Riot devolve a identidade já verificada.

- **Bloqueio real, sem jeito de contornar**: diferente do Discord (app
  próprio, self-service, client_id na hora), a Riot só entrega
  `client_id`/`client_secret` e registra o `redirect_uri` do RSO **depois**
  de aprovar o produto no Developer Portal (mesmo processo de §3.1). Não dá
  pra construir nem testar o fluxo de verdade antes disso — não é falta de
  tempo, é falta de credencial. Por isso "deixar pronto" aqui significa
  **especificação completa**, não código funcionando.
- **Fluxo previsto** (espelha o Discord OAuth já implementado em
  `apps/api/src/lib/discord.ts` + `routes/auth.ts`, adaptável quando a
  credencial sair):
  1. `GET /auth/riot` — redireciona pra authorize URL da Riot
     (`client_id`, `redirect_uri`, `scope`, `state` em cookie httpOnly,
     mesmo padrão do `STATE_COOKIE` de hoje).
  2. `GET /auth/riot/callback` — troca `code` por token; a Riot devolve a
     identidade do jogador (puuid) já autenticada — substitui, só nesse
     ponto, a chamada não-autenticada de hoje pra HenrikDev
     (`getAccountByRiotId` em `auth.ts`, rota `POST /auth/riot`).
  3. Existe `User` com esse puuid → loga. Não existe → cria — aqui esbarra
     no ponto de schema abaixo.
- **Decisão de modelo de dado a tomar só na hora de implementar** (não
  antecipar agora — a forma exata do que o RSO devolve só fica clara
  quando a Riot aprovar e a doc de RSO abrir de verdade): hoje
  `User.discordId` é obrigatório e único, o que por si só impede qualquer
  login que não seja Discord (RSO ou e-mail). Duas rotas possíveis quando
  chegar a hora:
  - Tornar `discordId`/`discordUsername` opcionais em `User` e adicionar os
    campos do provedor novo direto nele — mexe pouco, mas cada provedor
    novo vira mais uma constraint única ad-hoc nessa tabela.
  - Tabela separada `AuthIdentity` (`provider`, `providerId`, `userId`) —
    padrão usado por bibliotecas tipo Auth.js/NextAuth. Mais peça nova, mas
    isola login de perfil e escala melhor pra 3 provedores (Discord, RSO,
    e-mail) sem remexer `User` a cada um. **Recomendação**: essa segunda
    opção, quando for a hora.
  Não fiz essa migration agora de propósito — mudar o schema hoje pra um
  formato que pode não bater com o que a Riot realmente devolver seria
  código morto e não-testável até a aprovação sair.

Fontes: mesmas de §3.1 ([Riot Games Developer Policies](https://developer.riotgames.com/policies/general),
[VALORANT — Riot Developer Portal](https://developer.riotgames.com/docs/valorant)).

---

## 6. Pagamento

- **Gateway**: Mercado Pago (PIX/boleto, forte no Brasil, recorrência via
  cartão) vs Stripe (cartão internacional, já opera no Brasil em BRL,
  mais familiar em stacks Node) — decisão da Bruna, cada um tem trade-off
  de taxa/UX/burocracia de abertura de conta.
- Assinatura recorrente mensal, cancelamento self-service (§3.4).
- Anúncios como receita extra: cogitado, não decidido, e não antes de ter
  tráfego suficiente pra valer a pena (§3.5).

---

## 7. Infra e deploy

- Hoje: Railway (produção) + Neon Postgres (branch `production` separado
  do `dev`, ver memória do projeto sobre a cota de agosto/2026). Confirmar
  se o plano atual do Railway aguenta tráfego público antes da divulgação
  ampla (Fase C).
- Domínio: comprar (checar disponibilidade + ausência de conflito de marca
  no INPI antes de registrar) e apontar DNS.
- Trabalho desta frente inteiro na branch `dev` até validado.

---

## 8. Divulgação (go-to-market)

- Comunidade natural: espaços de Valorant no Discord, r/VALORANT e afins,
  Twitter/X da cena competitiva — mas checar regra de cada comunidade
  sobre autopromoção antes de postar.
- Possível parceria com criador de conteúdo/streamer de Valorant BR pra
  divulgar — decisão de mais pra frente, não bloqueia nada agora.
- Landing page própria antes de divulgar (separada do app logado), pra
  explicar a proposta e captar interesse antes do cadastro.

---

## 9. Suporte e operação pós-lançamento

- Canal de suporte/feedback (Discord próprio do produto, ou formulário) —
  com usuário desconhecido não dá mais pra depender de DM pessoal.
- Processo simples de triagem de bug (onde reportar, como priorizar) antes
  do volume de usuários crescer.

---

## 10. Fases (sequência, não data fixa)

| Fase | Escopo | Cobra? |
|---|---|---|
| **A — Fundação pro público** | §5 inteiro (arquitetura) + §3 (jurídico/marca/domínio/termos) + abrir processo de chave Riot | não |
| **B — Soft launch** | Cadastro aberto, divulgação pequena/controlada, pegar bug real antes de divulgar largo | não |
| **C — Divulgação ampla** | §8 — marketing de verdade | não |
| **D — Liga monetização** (~2 meses depois de B) | Paywall técnico + gateway de pagamento ativos; abrir MEI/CNPJ se ainda não existir | **sim** |
| **E — Anúncios** (opcional, sem data) | Só depois de D rodando e com tráfego que justifique | sim (indireto) |

---

## 11. Perguntas em aberto — em ordem do que precisa ser resolvido primeiro

1. **Nome/domínio candidato?** Bloqueia: checagem de marca no INPI, compra
   de domínio, identidade visual, registro no Riot Developer Portal (o
   produto precisa de nome pra ser cadastrado lá).
2. **Já existe CNPJ/MEI utilizável, ou abre um novo?** Não bloqueia o
   desenvolvimento (Fase A/B/C), mas precisa estar resolvido **antes** da
   Fase D — vale já direcionar com um contador em paralelo, sem pressa.
3. ~~Heatmap e Comentários ficam grátis ou PRO?~~ Resolvido (§4) — não
   fazem parte do lançamento, ponto final.
4. **Meta de usuários pra soft launch (Fase B) antes de abrir geral (Fase
   C)?** Ajuda a dimensionar infra (Railway/Neon) e o volume esperado pra
   pedir tier de chave (HenrikDev, enquanto a oficial não sai).
5. **Mercado Pago, Stripe, ou os dois?** Só bloqueia a Fase D — pode ficar
   pra decidir mais perto da hora.
6. **R$ 19,90/mês é preço final ou placeholder pra validar depois?** Idem,
   só importa perto da Fase D.

---

## 12. O que já dá pra começar agora — sem custo e sem implicação jurídica

Tudo isto é trabalho interno/técnico na branch `dev`, não expõe nada pro
público e não assume compromisso com terceiros:

- ✅ **Feito (2026-09-01):** Multi-tenancy — `Spot.equipeId` (migration),
      equipe deixou de ser `findFirst()` automático, fluxo de criar/entrar
      em equipe por convite (`/login/equipe`). Foi além do escopo original
      desta linha: rename completo "Time"→"Equipe" em todo o código (pedido
      à parte, escopo máximo — model Prisma, rotas, arquivos, texto),
      permissões de admin por equipe (`MembroEquipe.isAdmin`/`cargo`),
      página `/equipe/configuracoes` (imagem/nome/descrição da equipe,
      tabela de membros, promover admin/excluir membro/excluir equipe) e
      tela inicial da equipe virou resumo só-leitura. Ver memória do
      projeto (`project_lancamento_publico`) pro detalhe completo.
- ✅ **Feito (2026-09-01):** Allowlist de servidor Discord saiu do login —
      controle de acesso agora é por código de convite da equipe. Ver §5
      item 2.
- [ ] Modelagem técnica do paywall (schema `subscriptions`) — só a
      estrutura de dado, sem integrar nenhum gateway ainda.
- ✅ **Feito (2026-09-01):** Observabilidade — error tracking com Sentry
      (tier gratuito, opcional). Ver §5 item 4.
- [ ] Decisão interna de produto: escopo exato do PRO (pergunta #3 do §11
      — essa não depende de terceiro, só de decisão da Bruna).
- [ ] Brainstorm de nomes candidatos + **pesquisa** (não registro) de
      disponibilidade de domínio e de conflito no INPI — pesquisar é de
      graça, registrar é que tem custo/compromisso.
- ✅ **Feito (2026-09-01):** Rascunho do conteúdo que Termos de Uso e
      Política de Privacidade vão precisar cobrir — foi além do "interno,
      não publicado" original: virou páginas de verdade (`/termos`,
      `/privacidade`, acessíveis sem login) com aviso de rascunho/sem
      revisão jurídica bem visível no topo, mais um rodapé (linha fina +
      mira pequena + "todos os direitos reservados" + links pros dois) que
      aparece no fim de toda página, logada ou não. Ainda falta a revisão
      jurídica formal de verdade antes de tirar o aviso.
- [ ] Planejar canais de divulgação (§8) — sem contatar ninguém ainda.

Fora dessa lista (tem custo e/ou implicação jurídica, mesmo que pequena):
registrar no Riot Developer Portal (aceita um contrato de desenvolvedor,
mesmo sendo grátis), comprar domínio, abrir MEI/CNPJ, publicar Termos/
Privacidade de verdade, integrar gateway de pagamento.

---

## Fontes consultadas

- [Riot Games Developer Policies (geral)](https://developer.riotgames.com/policies/general)
- [VALORANT — Riot Developer Portal](https://developer.riotgames.com/docs/valorant)
- [HenrikDev API docs](https://docs.henrikdev.xyz/valorant/general)
- [Limite de faturamento MEI 2026 — Contabilizei](https://www.contabilizei.com.br/contabilidade-online/faturamento-mei-2026/)
