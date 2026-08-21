# callout — progresso

> Documento de handoff de **implementação** (o que já existe, como rodar,
> o que falta). Para o briefing de produto/arquitetura, ver [CONTEXT.md](CONTEXT.md).
> Última atualização: 2026-08-21.

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

### Fase 0 — Fundação — ✅ completa (exceto item 4)
1. ✅ `packages/shared` — tipos de domínio (`domain.ts`), schemas Zod da
   HenrikDev (`henrikdev.ts`) e da valorant-api.com (`valorant-api.ts`)
2. ✅ Scaffold do `apps/api` (Fastify + TS + Prisma)
3. ✅ Schema Prisma aplicado no Neon (5 migrations, ver abaixo)
4. ⬜ Job de seed dos assets estáticos (mapas/agentes da valorant-api.com)
   — **não construído ainda**. Só é necessário a partir da Fase 3/5
   (cores reais de agente, minimapa real no board). Até lá, cor de agente
   no dashboard é cinza neutro (`#9A9DA1`) e o mapa do board é o SVG
   esquemático do protótipo.

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

### Fase 3 — Board de estratégia — ⬜ não iniciada
Hoje o Board (`apps/web/src/pages/Board.tsx`) é 100% mock: drag-and-drop
funciona visualmente (Pointer Events, posições em %), mas nada persiste —
recarrega a página e volta pro estado inicial. `strategies` e
`initialPieces` vêm de `apps/web/src/data/mock.ts`.

**Falta:**
1. Modelos `Strategy`/`StratItem` já existem no schema Prisma (ver
   `apps/api/prisma/schema.prisma`) — só falta os endpoints:
   - `GET /strategies` — lista do time (pra sidebar do board)
   - `GET /strategies/:id` — uma estratégia com seus `items`
   - `POST /strategies` — criar
   - `PATCH /strategies/:id` — salvar título/descrição/items (posição das
     fichas, setas) quando clica "Salvar"
2. Trocar `apps/web/src/pages/Board.tsx` pra consumir a API real em vez
   do mock — provavelmente adicionar `strategies`/`reloadStrategies` ao
   `useAppData` (`apps/web/src/lib/appData.ts`), do mesmo jeito que
   `team`/`dashboard` já funcionam
3. Setas/linhas desenhadas hoje são só decorativas no mock
   (`boardArrows`) — decidir se entram no `StratItem.payload` (tipo
   `arrow`/`line` já existe no `StratItemKind` do domain.ts) ou ficam de
   fora por enquanto

### Fase 4 — Spots + comentários — ⬜ não iniciada
- `Spot` e `Comment` já existem no schema Prisma, sem endpoints ainda
- Falta decidir onde guardar imagem/vídeo do lineup (S3, Cloudinary, R2?)
  antes de implementar o upload
- Comentários são polimórficos (`entidadeTipo` + `entidadeId`) — servem
  pra partida, estratégia e spot com uma tabela só
- `apps/web/src/pages/MatchDetail.tsx` já tem a UI de comentários pronta
  (mock) — é só ligar

### Fase 5 — Heatmap — ⬜ não iniciada
Depende da Fase 0 item 4 (seed de mapas) pra ter o minimapa real e a
função `gameLocationToMinimapPosition` (já existe em
`packages/shared/src/valorant-api.ts`, mas não testada com partida real
ainda — o próprio código avisa: "validar com uma partida real conhecida
antes de confiar no resultado").

---

## O que é real vs. mock hoje

| Tela | Estado |
|---|---|
| Login (2 etapas) | ✅ real |
| Dashboard | ✅ real |
| Time | ✅ real |
| Detalhe de partida | ❌ mock — `MatchDetail.tsx` não busca nada, sempre mostra a mesma partida fake "Bind" |
| Board | ❌ mock — drag funciona, nada persiste |
| Spots | ❌ mock — busca/filtro funcionam sobre dado fake |

O link de "partida recente" no dashboard já navega pra `/partida/:id`
com o `id` real do banco — só o componente de destino que ainda ignora
o param e mostra sempre o mock.

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

- `apps/web/src/components/AppShell.tsx` — os links de "Partidas" e
  "Board" na sidebar ainda apontam pra ids do mock (`recentMatches[0].id`,
  `strategies[0].id`), não pro dado real — só importa quando essas telas
  também ficarem reais.
- Busca no header (`AppShell.tsx`) é só visual, não filtra nada ainda.
- `rank.rrDelta7d` no dashboard é somado a partir do histórico de RR de
  verdade agora (não é mais placeholder) — mas se a HenrikDev não tiver
  histórico suficiente, fica 0 silenciosamente.
