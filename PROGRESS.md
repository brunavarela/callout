# callout — progresso

> Documento de handoff de **implementação** (o que já existe, como rodar,
> o que falta). Para o briefing de produto/arquitetura, ver [CONTEXT.md](CONTEXT.md).
> Última atualização: 2026-08-22.

---

## Como rodar

Dois servidores, dois terminais:

```
cd apps/api && npm run dev    # http://localhost:4025
cd apps/web && npm run dev    # http://localhost:5290
```

Ou da raiz: `npm run dev:api` / `npm run dev:web`.

O `.env` na raiz já tem tudo preenchido (Neon, Discord OAuth2, chave da
HenrikDev) — não precisa reconfigurar nada pra continuar o trabalho.
`apps/api/.env` é uma cópia só do `DATABASE_URL`, só pro Prisma CLI achar;
a fonte de verdade é o `.env` da raiz.

Portas fixadas em 4025/5290 porque 3333/5173 já estavam em uso por outros
projetos nesta máquina (`iexfy_app_back-end` e `sg-super-web-frontend`).

---

## Estado por fase

### Fase 0 — Fundação — ✅ completa
1. ✅ `packages/shared` — tipos de domínio (`domain.ts`), schemas Zod da
   HenrikDev (`henrikdev.ts`) e da valorant-api.com (`valorant-api.ts`)
2. ✅ Scaffold do `apps/api` (Fastify + TS + Prisma)
3. ✅ Schema Prisma aplicado no Neon (5 migrations, ver abaixo)
4. ✅ Job de seed dos assets estáticos (2026-08-22) — `npm run seed:assets`
   (`apps/api/src/scripts/seedAssets.ts` + `apps/api/src/lib/assets.ts`),
   busca mapas e agentes reais direto da valorant-api.com (pública, sem
   chave). **Já rodado contra o Neon real**: 13 mapas competitivos
   (filtrados por `callouts !== null && xMultiplier !== 0` — descarta
   Range/Skirmish/minigames) e 29 agentes. `seedMaps()` casa o placeholder
   existente (criado por `ensureMapAsset`) pelo `nome` e faz `update` na
   mesma linha em vez de criar uma nova — preserva o `id` que
   Match/Strategy/Spot já referenciam (confirmado: o Bind virou real sem
   duplicar linha). Cor de agente vem de `backgroundGradientColors[0]` da
   API (campo que não estava no schema Zod, adicionado agora).

   **Religado ao front (2026-08-22, mesmo dia)**: `GET /agents`
   (`apps/api/src/routes/agents.ts`) expõe o catálogo real; `dashboard.ts`
   e `matches.ts` resolvem `agentColor`/`AgentWinrate.color` de verdade via
   `loadAgentColorsByName()` (`apps/api/src/lib/assets.ts`) em vez do cinza
   fixo — `MatchDetail.tsx` ganhou um swatch na coluna de agente pra
   mostrar isso (o dado já vinha no DTO, só não era desenhado). `Strategy`
   e `Spot` ganharam `mapDisplayIcon` no DTO (`toStrategyDTO`/`toSpotDTO`);
   Board e Spots trocam o SVG esquemático pela imagem real do minimapa
   quando ela existe, e o seletor de agente usa `GET /agents` (cai pra
   `PLACEHOLDER_AGENTS` só se a lista real ainda não carregou/seed nunca
   rodou). Fichas já salvas com os ids antigos (`'viper'` etc.) continuam
   normais — cor/label ficam gravados no `StratItem`/`Spot` no momento da
   criação, não são resolvidos ao vivo.

   **Bug pego e corrigido no processo**: `ensureMapAsset()` casava só por
   `uuid` (`placeholder-${slug}`) — depois que o seed troca o placeholder
   pelo real (uuid muda), criar uma estratégia/spot novo pro mesmo mapa
   duplicava a linha (`placeholder-bind` novo ao lado do Bind real).
   Corrigido pra casar por `nome` primeiro. Uma estratégia e um spot de
   teste criados antes do fix foram migrados manualmente pra linha real
   e o duplicado foi removido (sem perda de dado).

### Fase 1 — Login real + dashboard — ✅ completa
- Discord OAuth2 com allowlist do servidor (`GET /auth/discord`,
  `/auth/discord/callback`, `/auth/me`, `POST /auth/logout`)
- Vínculo de Riot ID via HenrikDev (`POST /auth/riot`)
- Sync sob demanda — botão no header, não é cron (`POST/GET /sync`)
- Dashboard com dado real: KPIs (KDA/ACS/ADR/HS%/winrate) com sparkline
  por partida, winrate por mapa/agente, partidas recentes, rank atual
- **v2**: gráfico de progressão de RR real (histórico da HenrikDev,
  `GET /dashboard/rr-history?range=7d|30d|90d`) e donut de lados
  ataque/defesa/overtime (`GET /dashboard/sides`, calculado a partir dos
  `rounds` já sincronizados — usa eventos de *plant* como âncora pra
  descobrir qual time atacou em cada metade; ver `apps/api/src/lib/insights.ts`)

### Fase 2 — Time — ✅ completa
- Time único criado automaticamente no primeiro login (nome vem do
  servidor Discord real, não é mais fixo) — `apps/api/src/lib/team.ts`
- `GET /team` — membros com KDA/ACS/winrate reais (30d), rank, partidas
  jogadas juntos (cruza `MatchPlayer` por `matchId`)
- `PATCH /team/members/:userId/note` — recado social editável (clique
  duplo no card, na tela Time)

### Fase 3 — Board de estratégia — ✅ completa
- `GET/POST /strategies`, `GET/PATCH /strategies/:id` —
  `apps/api/src/routes/strategies.ts` + `apps/api/src/lib/strategy.ts`
- "Salvar" substitui o board inteiro (deleta e recria os `StratItem`) em
  vez de diffar contra o estado anterior — mais simples e previsível
- `ensureMapAsset()` cria um `MapAsset` placeholder por nome (ex.: um mapa
  novo criado antes do próximo `npm run seed:assets` rodar) — o seed da
  Fase 0 item 4 (já construído e já rodado pro catálogo atual) casa por
  `nome` e atualiza o placeholder em vez de duplicar
- `apps/web/src/pages/Board.tsx` carrega/salva de verdade via
  `useAppData` (`strategies`, `saveStrategy`, `createStrategy`,
  `loadStrategies`) — estratégias carregam sob demanda (só quando o Board
  é aberto), diferente de time/dashboard que carregam no login
- Rota mudou de `/board/:id` obrigatório pra `/board` + `/board/:id`
  opcional — sem estratégia selecionada, cai na primeira da lista
- Contagem de usos/winrate por estratégia (que existia no mock, "4 usos
  · 75% WR") foi **removida da UI real** — depende de ligar partida↔
  estratégia, que não existe no schema. `Strategy.usageCount` e
  `winratePercent` no DTO ficam hardcoded em 0 até isso ser construído.

**Gap fechado (2026-08-22):** agora dá pra *adicionar* fichas novas
clicando na toolbar — agente (com seletor de agente, paleta placeholder
`PLACEHOLDER_AGENTS` — ainda não religada aos uuids reais do seed, ver
Fase 0 item 4), smoke, flash e molly. Clique no canvas com
a ferramenta ativa cria a ficha na posição do clique; arrastar continua
funcionando pras fichas já existentes; a borracha agora remove fichas de
verdade (antes só selecionava visualmente). Ver
`apps/web/src/pages/Board.tsx` (`AGENTS`, `KIND_META`,
`onCanvasPointerDown`, `startDrag`).

**Gap fechado (2026-08-22, débito técnico):** setas/linhas (`arrow`/
`line`) agora são clicáveis — seleciona a ferramenta, clica na origem
(marca um ponto pendente), clica no destino, cria o `StratItem` com
`points: [origem, destino]`. Seta desenha com ponta (SVG `<marker>` por
`id` único); linha desenha tracejada, sem ponta. Borracha apaga
setas/linhas clicando perto delas (hit-area invisível de 16px em volta
do traço real, só ativa com a ferramenta borracha selecionada). Não tem
arrastar ponta depois de criada — só criar/apagar, que já é o suficiente
pra sair de "zero interação" pra "usável". `boardArrows`/`boardCallouts`
do mock continuam só como fallback decorativo pros poucos mapas sem
`mapDisplayIcon` real.

### Fase 4 — Spots + comentários — ✅ completa
- ✅ Comentários (2026-08-22): `POST /comments` (`apps/api/src/routes/comments.ts`
  + `apps/api/src/lib/comments.ts`) — polimórfico (`entidadeTipo` +
  `entidadeId`), valida que a entidade (match/strategy/spot) existe antes
  de criar. `GET /matches/:id` já devolve os comentários reais via
  `listComments("match", id)`. `MatchDetail.tsx` liga o campo de texto
  que já existia (Enter envia, aparece na lista sem reload). Comentários
  em estratégia/spot: endpoint já serve os três tipos, mas nenhuma tela
  ainda tem painel de comentário pra ligar (Board não tem, Spots nem
  existe de verdade ainda) — `toStrategyDTO` continua com `comments: []`
  hardcoded até o Board ganhar essa UI.
- ✅ Spots (2026-08-22): `GET/POST /spots` (`apps/api/src/routes/spots.ts`
  + `apps/api/src/lib/spots.ts`). `Spot.videoUrl` é opcional (`String?`),
  então não precisou resolver upload de arquivo — o formulário tem um
  campo de link (Discord/clipe) em vez de upload; `mediaUrl` fica `null`
  se não preenchido. Mesmo problema do Board pra agente: `Spot.agentUuid`
  não é FK de verdade — resolvido com a mesma paleta placeholder (ainda
  não religada aos uuids reais do seed, ver Fase 0 item 4), agora
  compartilhada em
  `packages/shared/src/agents.ts` (`PLACEHOLDER_AGENTS`) e reusada pelo
  Board também (antes tinha uma cópia local lá). Schema não tem `teamId`
  em `Spot`, então `GET /spots` é uma lista global (todo usuário logado
  vê todos os spots de todo mundo) — não filtra por time porque o schema
  não suporta isso hoje.
  `apps/web/src/pages/Spots.tsx` ganhou um fluxo completo de criação:
  botão "+ Novo spot" abre um modal com mapa/habilidade/lado/agente,
  notas e link opcionais, e um picker de clique no mini-mapa (reusa
  `MapSchematic`) pra marcar origem e alvo — 1º clique marca origem, 2º
  marca alvo, 3º reinicia. O mesmo componente (`SpotPreview`) desenha a
  origem/alvo/linha nos cards da listagem, sem interação — não tem
  upload de imagem real (nunca teve, nem no mock: o card sempre foi um
  placeholder "PRINT DA MIRA").

### Fase 5 — Heatmap — ✅ completa
`GET /heatmap?map=&kind=kills|deaths` (`apps/api/src/routes/heatmap.ts` +
`apps/api/src/lib/heatmap.ts`) + tela nova `apps/web/src/pages/Heatmap.tsx`
(nav item novo, rota `/heatmap`). Chips de mapa vêm de
`dashboard.mapWinrates` (reaproveita o que já carrega no login, sem
endpoint novo de "lista de mapas") — só mostra mapas que a conta
realmente jogou nos últimos 30 dias.

**A fórmula do CONTEXT.md §5.4 (`gameLocationToMinimapPosition`) foi
validada com partida real** (2026-08-22) — a validação que o código
pedia e nunca tinha sido feita. Processo: rodei o endpoint contra o
histórico real da conta, plotei os pontos por cima do minimapa oficial
baixado da valorant-api.com e conferi visualmente que caem nos
corredores/salas, não em paredes. Bind e Summit conferidos assim,
resultado limpo — a inversão de eixo (y do jogo vira x do mapa) está
certa como documentada, sem precisar do fallback "tente sem a
inversão".

**Bug real achado nessa validação e corrigido:** `player_locations` de
cada kill (payload da HenrikDev) traz a posição de todo mundo *exceto*
quem morreu naquele abate — confirmado comparando com dado real
(`MatchPlayer.deaths` de uma partida tinha 19 mortes, o heatmap de
mortes voltava 0 pontos). "Kills" usa a entrada do matador em
`player_locations` (funciona); "deaths" precisa usar o campo solto
`kill.location`, que é a posição de quem morreu — não estava óbvio pela
doc do schema. Depois do fix, mortes bateram exatamente com
`MatchPlayer.deaths` e os pontos também caíram nos corredores certos.

Mesmo problema do Board/Spots pra filtrar por mapa: na época dessa
Fase, `Match.mapId` nunca tinha sido preenchido pelo sync (fica
`null`). `buildHeatmap()` filtra pelo nome do mapa dentro do `rawJson`,
igual `dashboard.ts` já fazia — o débito do `mapId` foi corrigido
depois, ver "Débitos técnicos" abaixo, mas `buildHeatmap()` não foi
migrado pra usar a FK porque não tinha necessidade (filtrar por nome já
funciona e é o mesmo padrão do resto do código).

---

## O que é real vs. mock hoje

| Tela | Estado |
|---|---|
| Login (2 etapas) | ✅ real |
| Dashboard | ✅ real |
| Time | ✅ real |
| Detalhe de partida | ✅ real (2026-08-22) — `GET /matches/:id`, ver abaixo |
| Board | ✅ real — carrega/arrasta/adiciona/apaga/salva de verdade, incluindo setas/linhas (ver Fase 3) |
| Spots | ✅ real (2026-08-22) — lista/filtra/cria com picker no mapa (ver Fase 4) |
| Heatmap | ✅ real (2026-08-22) — tela nova, `GET /heatmap` (ver Fase 5) |

`MatchDetail.tsx` agora busca `GET /matches/:id` (`apps/api/src/routes/matches.ts`
+ `apps/api/src/lib/matches.ts`) direto na página via `useParams` — não
passa pelo cache do `useAppData`/`OutletContext` porque não existe uma
lista de "todos os detalhes de partida" em cache em lugar nenhum (só o
resumo em `dashboard.recentMatches`, capado em 7). A rota confere que o
usuário logado tem uma `MatchPlayer` naquela partida (via `riotPuuid`)
antes de responder — 404 senão. Placar/rounds/duração vêm de
`Match.rawJson` (não há tabela de rounds normalizada); KDA/ACS agregados
vêm de `MatchPlayer`. `firstBloods`/`clutches`/`plants` são calculados
simulando a ordem de kills por round (não existiam antes, novo). Cor de
agente por jogador é cinza placeholder (`#9A9DA1`), mesmo motivo do
dashboard — o seed da Fase 0 item 4 já tem a cor real (`AgentAsset.cor`),
só falta esse endpoint ler de lá em vez do fixo. Comentários já são reais
(ver Fase 4) — o campo de texto envia com Enter.

O link "Partidas" da sidebar (`AppShell.tsx`) e o link de "partida
recente" no dashboard já apontam pro `id` real do banco.

---

## Schema do banco (Prisma → Neon)

Migrations aplicadas, em ordem: `init` → `user_riot_region` →
`match_player_rounds` → `team_member_nota` → `user_theme`.

Tabelas: `users`, `maps`, `agents`, `matches`, `match_players`, `teams`,
`team_members`, `strategies`, `strat_items`, `spots`, `comments`.
`maps`/`agents`/`spots`/`strategies` existem no schema mas estão vazias
(dependem das fases 3-5).

---

## Arquitetura do front que vale lembrar

- **Cache de dados**: `apps/web/src/lib/appData.ts` (hook `useAppData`)
  centraliza dashboard/time/sync no `AppShell`, exposto via
  `useOutletContext<OutletContext>()`. Páginas não buscam mais os
  próprios dados — só leem do contexto. Só rebusca quando a sincronização
  termina ou por ação explícita (`reloadDashboard`, `reloadTeam`). Se o
  Board/Spots ganharem dado real, seguir o mesmo padrão em vez de dar
  `useEffect` de fetch dentro da página.
- **Tema**: `apps/web/src/lib/theme.tsx` (`ThemeProvider`/`useTheme`) —
  injeta `--acc`/`--pos`/etc. como CSS custom properties num wrapper.
  Persistido por usuário (`PATCH /me/theme`), editável pelo clique no
  avatar da sidebar (`ThemeSettings.tsx`).
- **Sessão**: `apps/web/src/lib/session.tsx` (`SessionProvider`/`useSession`)
  — busca `/auth/me` uma vez no boot do app.
- **Design v2**: cantos arredondados, glows radiais, cards tintados. Se
  outro handoff de design aparecer, ver `Downloads/Formulário de
  requisitos de design 2/design_handoff_callout/README.md` pra token de
  referência.

---

## Débitos técnicos conhecidos (não bloqueiam, mas anotar)

- ✅ **Resolvido (2026-08-22):** `Match.mapId` agora é preenchido no sync
  (`persistMatchIfNew()` chama `ensureMapAsset()`, igual estratégias/spots
  já faziam). Rodei `npm run backfill:match-map-id` uma vez contra o Neon
  pra ligar as 15 partidas já sincronizadas antes do fix (0 ficaram sem
  `mapId`). `dashboard.ts`/`heatmap.ts` continuam lendo
  `rawJson.metadata.map.name` em vez da relação — não precisou trocar
  isso pra fechar o débito, só garantir que a FK existe pra quem quiser
  usar dela pra frente.
- ✅ **Resolvido (2026-08-22):** busca no header (`AppShell.tsx`,
  componente `SearchBar`) agora filtra de verdade — dropdown com até 5
  resultados por grupo (Partidas/Mapas/Estratégias), busca client-side
  sobre o que já está em cache (`dashboard.recentMatches`,
  `dashboard.mapWinrates`, `strategies`). Clique navega: partida →
  `/partida/:id`, mapa → `/heatmap?map=X` (Heatmap.tsx agora lê esse
  query param como seleção inicial), estratégia → `/board/:id`. Não é
  busca "agente" separada — digitar um nome de agente já acha as
  partidas em que ele apareceu, cobre o caso sem precisar de destino
  próprio pra agente (não existe tela por-agente no app). Estratégias só
  aparecem na busca se a lista já tiver carregado (visita anterior ao
  Board) — não força carregar sob demanda só pra busca, mantém o padrão
  de cache documentado abaixo.
- `rank.rrDelta7d` no dashboard é somado a partir do histórico de RR de
  verdade agora (não é mais placeholder) — mas se a HenrikDev não tiver
  histórico suficiente, fica 0 silenciosamente.
- Não existe `GET /maps` — só `mapDisplayIcon` embutido no DTO de
  `Strategy`/`Spot` (resolvido no backend). Se alguma tela precisar de
  uma lista de mapas independente de estratégia/spot (ex.: um seletor de
  mapa com preview antes de criar), aí sim vale expor a rota.
  `Spot.mapDisplayIcon` só existe pra spots já salvos — o modal de criar
  spot ainda mostra o esquema placeholder enquanto o usuário digita o
  nome do mapa (não busca preview ao vivo).
