# callout — contexto do projeto

> Documento de handoff. Leia inteiro antes de escrever qualquer código.
> Se algo aqui conflitar com um pedido pontual, pergunte antes de assumir.

---

## 1. O que é

**callout** é uma ferramenta privada de análise de desempenho e planejamento de
estratégia para um grupo pequeno de amigos que joga VALORANT.

Duas metades, igualmente importantes:

1. **Análise individual** — cada jogador vê seu histórico de partidas e estatísticas
   agregadas (KDA, ACS, HS%, winrate por mapa e por agente, evolução de rank).
2. **Trabalho de time** — montar o time, definir funções, desenhar estratégias em
   cima dos mapas, salvar lineups (spots de smoke/flash/molly) e comentar tudo isso.

Escala alvo: **menos de 10 usuários**. Não é SaaS, não vai escalar, não precisa de
multi-tenancy. Otimize para clareza e velocidade de desenvolvimento, não para carga.

Nome vem do vocabulário do jogo: *callout* é o nome que os jogadores dão aos pontos
do mapa ("A Heaven", "Meio"). É também literalmente um campo que a API de mapas
retorna. O nome cobre as duas metades do produto: comunicação de time e mapa.

---

## 2. Quem vai usar / quem desenvolve

A desenvolvedora é **Bruna**, programadora JavaScript. Stack do dia a dia: **Node,
React e SQL Server**. Fala português do Brasil e prefere comunicação direta e
casual. Ela questiona informação inconsistente — então não afirme com confiança
o que você não verificou. Se não souber o formato de uma resposta de API, diga que
precisa checar e cheque.

---

## 3. Stack decidida

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | React + Vite + TypeScript | Stack dela, build rápido |
| Backend | Node + **Fastify** + TypeScript | BFF; Fastify pela ergonomia de plugins e validação de schema |
| Banco | **Postgres no Neon** | Free tier real; PlanetScale foi descartado (ver §4) |
| ORM | **Prisma** | Migrations declarativas, tipagem forte, curva curta vindo de SQL Server |
| Canvas | **react-konva** | Board de estratégia: drag, camadas e hit detection prontos |
| Auth | **Discord OAuth2** | Ver §6 |

Monorepo:

```
callout/
├── apps/
│   ├── web/          # React + Vite
│   └── api/          # Node + Fastify
├── packages/
│   └── shared/       # tipos TS compartilhados (Match, Player, MapData, StratItem...)
├── .env.example
└── README.md
```

O `packages/shared` existe para tipar as respostas das APIs externas **uma vez só**
e reusar nos dois lados. Quando a API não-oficial mudar de formato (vai mudar),
o conserto é num lugar só.

---

## 4. Por que Neon e não PlanetScale

PlanetScale era a ideia original, mas o tier gratuito Hobby foi removido em abril
de 2024 e nunca voltou. Hoje o piso é ~US$5/mês num Postgres single node. Não é
caro, mas para um projeto de amigos não há motivo para pagar: Neon (ou Supabase)
entrega Postgres com free tier de verdade.

Se em algum momento o Supabase for escolhido no lugar do Neon, ele traz auth e
realtime prontos — o que ajudaria nos comentários e na colaboração no board.
Por ora: **Neon + Prisma + auth próprio via Discord**.

---

## 5. Dados: a parte crítica

### 5.1 A API oficial da Riot está fora

Os endpoints existem (`VAL-MATCH-V1`, `VAL-RANKED-V1`, `VAL-CONTENT-V1`,
`VAL-STATUS-V1`) mas o acesso não. Fatos verificados na documentação oficial:

- Personal keys **não são suportadas** para VALORANT. Só chave de produção.
- Chave de produção exige mostrar fluxo de usuário, site/protótipo funcional e
  integração com RSO (Riot Sign On) para opt-in do jogador.
- A lista oficial de casos de uso **não aprovados** inclui, textualmente, "apps que
  não são públicos e são feitos apenas para uso pessoal".

Ou seja: um site fechado para 10 amigos é exatamente o perfil recusado. **Não
gaste tempo tentando esse caminho.** Se o projeto um dia virar público, aí sim
vale reabrir a discussão.

### 5.2 Fonte de dados de partida: HenrikDev API (não-oficial)

- Base: `https://api.henrikdev.xyz`
- Auth: header `Authorization: <API_KEY>`
- Chave gerada em `https://api.henrikdev.xyz/dashboard/` (requer entrar no Discord
  dele e descrever o caso de uso)
- Versão da doc na última verificação: **v4.5.0 (18/12/2025)** — docs em
  `https://docs.henrikdev.xyz`, OpenAPI spec em `https://api.henrikdev.xyz/docs`

Endpoints relevantes (verificados em `docs.henrikdev.xyz` — ver `packages/shared/src/henrikdev.ts`
para os schemas Zod exatos):

| Uso | Endpoint |
|---|---|
| Resolver Riot ID → puuid | `GET /valorant/v2/account/{name}/{tag}` |
| Conta por puuid | `GET /valorant/v2/by-puuid/account/{puuid}` |
| Histórico de partidas | `GET /valorant/v4/by-puuid/matches/{affinity}/{platform}/{puuid}` |
| Detalhe de partida | `GET /valorant/v4/match/{affinity}/{match_id}` — inclui rounds, kills e **coordenadas** |
| MMR / histórico de rank | `GET /valorant/v2/by-puuid/mmr/{affinity}/{platform}/{puuid}` e variante `-history` |

**Riscos a ter em mente e comunicar:** é não-oficial, pode quebrar em qualquer
patch, tem rate limit por tier de chave, e a Riot pode derrubar. Nunca trate
uma resposta dela como garantida — valide schema na borda (Zod) e falhe
explicitamente, sem quebrar a tela inteira.

### 5.3 Assets estáticos: valorant-api.com

`https://valorant-api.com` — agentes, armas, skins, ícones, mapas. Sem key.

O endpoint de mapas é essencial para o board e o heatmap. Campos que importam:

- `displayIcon` — imagem do minimapa (~1000×1000)
- `xMultiplier`, `yMultiplier`, `xScalarToAdd`, `yScalarToAdd` — conversão de
  coordenada
- `callouts[]` — `regionName`, `superRegionName`, `location {x, y}`

**Faça cache local desses assets.** Não bata na API a cada render. Um job de
seed popula uma tabela de mapas/agentes e o front consome do nosso banco.

### 5.4 Conversão de coordenada do jogo → minimapa

```js
// resultado normalizado (0..1) sobre a imagem do minimapa
const px = (loc.y * map.xMultiplier) + map.xScalarToAdd;
const py = (loc.x * map.yMultiplier) + map.yScalarToAdd;
// para pixels: px * larguraDaImagem, py * alturaDaImagem
```

Sim, o `y` do jogo vira o `x` do mapa — os eixos são invertidos. É um
comportamento conhecido, mas **valide com uma partida real conhecida** antes de
construir em cima. Se der errado, tente sem a inversão antes de mexer em
qualquer outra coisa.

### 5.5 Limitação de escopo dos dados

A API entrega **eventos discretos** — kills, plants, defuses, compras por round.
Não existe replay nem posicionamento contínuo dos jogadores. Não prometa nem
projete features que dependam de reconstruir movimento.

---

## 6. Autenticação

**Regra absoluta: o app NUNCA pede usuário e senha da Riot.** Isso é vetor de
roubo de conta, quebra o ToS da Riot e mata o projeto. Se em algum momento uma
tarefa parecer pedir isso, pare e levante a questão.

O RSO (OAuth2 oficial da Riot) seria o caminho correto, mas só está disponível
para quem tem chave de produção — que, por §5.1, não vamos ter.

Fluxo adotado:

1. Login via **Discord OAuth2**. Restringir a membros de um servidor específico
   resolve o controle de acesso do grupo fechado sem construir nada.
2. Após login, o usuário informa o Riot ID no formato `nome#tag`.
3. Backend valida chamando a HenrikDev, guarda o `puuid` e usa ele daí em diante.

A modelagem é `usuário → puuid`. Se um dia migrarmos para RSO, só a etapa 2 muda.

---

## 7. Schema inicial

Ponto de partida, não verdade final. x/y sempre **normalizados 0..1**, nunca em
pixels — assim o mesmo dado serve para desktop, mobile e qualquer resolução de
imagem de mapa.

```
users         (id, discord_id, riot_puuid, riot_name, riot_tag, funcao_preferida, created_at)
maps          (id, uuid, nome, display_icon, x_multiplier, y_multiplier,
               x_scalar, y_scalar, callouts JSONB)
agents        (id, uuid, nome, funcao, display_icon)

matches       (match_id PK, map_id, modo, started_at, raw_json JSONB)
match_players (match_id, puuid, agent_id, kills, deaths, assists, acs, adr, hs_pct, ...)

teams         (id, nome, owner_id)
team_members  (team_id, user_id, funcao)      -- controlador, duelista, iniciador, sentinela

strategies    (id, team_id, map_id, lado, titulo, descricao, criado_por, created_at)
strat_items   (id, strategy_id, tipo, x, y, agent_id, payload JSONB)

spots         (id, map_id, agent_id, habilidade, x_origem, y_origem,
               x_alvo, y_alvo, video_url, notas, criado_por)

comments      (id, entidade_tipo, entidade_id, user_id, texto, created_at)
```

`matches.raw_json` guarda a resposta bruta. Quando a gente descobrir que quer um
campo que não extraiu, ele já está lá — sem precisar rebuscar a API.

`comments` é polimórfico de propósito (`entidade_tipo` + `entidade_id`): comenta
em partida, em estratégia e em spot com uma tabela só. Para essa escala, o custo
de não ter FK real é irrelevante.

---

## 8. Estratégia de sincronização e cache

O backend **não é um proxy** da HenrikDev. Isso é inegociável — proxy direto
estoura rate limit e deixa a interface lenta.

- **Partida antiga nunca muda.** Buscou uma vez, persistiu, nunca mais chama a API
  para aquele `match_id`.
- **Job de sync** roda a cada N minutos, varre os `puuid` cadastrados, busca só o
  matchlist recente e persiste o que for novo.
- **O dashboard lê exclusivamente do nosso Postgres.** Fica instantâneo e
  independente da disponibilidade da API externa.
- Rate limiting próprio na saída (fila com concorrência limitada), com backoff em
  429. Melhor sync lento que chave bloqueada.

---

## 9. Roadmap

Fase 1 concentra praticamente todo o risco técnico. Ela precisa estar inteira de
pé antes de qualquer coisa das fases seguintes.

| Fase | Escopo |
|---|---|
| **1** | Login Discord + vínculo de Riot ID + job de sync + dashboard individual (KDA, ACS, HS%, winrate por mapa/agente) |
| 2 | Times, funções, dashboard comparativo do grupo |
| 3 | Board de estratégia por mapa, salvar/carregar |
| 4 | Spots/lineups com imagem ou vídeo + comentários |
| 5 | Heatmap de kills sobre o minimapa com dados reais |

---

## 10. Restrições que não podem ser esquecidas

1. **Nunca pedir credenciais da Riot.** (§6)
2. **Não usar "Valorant" no nome do produto, domínio ou branding.** Marca
   registrada, e dá aparência de afiliação oficial. Arte de agente e mapa vinda
   da API é *conteúdo* exibido, não identidade visual do produto.
3. **Não usar logos ou marcas da Riot** na identidade do app.
4. Se o site algum dia ficar público, incluir disclaimer de não-afiliação e de
   opt-in de compartilhamento de dados.
5. Nenhuma feature de vantagem em tempo real durante a partida — isso é
   explicitamente proibido pela política da Riot e é a linha que separa ferramenta
   de análise de cheat.

---

## 11. Como trabalhar comigo neste repo

- Português do Brasil, tom direto.
- Antes de criar arquivo novo, verifique se já existe algo que faz aquilo.
- Tipagem forte em tudo. Sem `any` em resposta de API externa — valide com Zod.
- Commits pequenos e descritivos.
- Se uma decisão de arquitetura deste documento parecer errada durante o
  desenvolvimento, **diga**. O documento é um ponto de partida informado, não
  uma sentença.

---

## 12. Design

O handoff de design (telas, tokens de cor/tipografia/espaçamento, comportamento
responsivo) está implementado em `apps/web`. Fonte: pacote "Formulário de
requisitos de design" — protótipo HTML de referência, não normativo em estrutura
de dados, normativo em fidelidade visual. Ver `apps/web/README.md` para o mapeamento
de tokens e decisões de adaptação tomadas durante a implementação.
