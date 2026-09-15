import { useState } from 'react';
import type { ReactNode } from 'react';
import type { MatchModeFilter, RecentFormInsights, RrHistoryPoint, SeasonMatchesPage, SeasonOverview } from '@callout/shared';
import { LoadingFill } from './Spinner';
import { SeasonMatchesList } from './SeasonMatchesList';
import { RrHistoryCard } from './RrHistoryCard';
import { Modal, ModalHeader } from './Modal';
import { cardStyle, fmtNum, fmtDelta, plural, LOW_SAMPLE, MIN_SAMPLE, GOLD, InfoDot } from './statsPrimitives';
import { formatPlaytime } from '../lib/seasonFormat';

const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--neg, #EF4958)';
const UNDER_50 = 'color-mix(in srgb, var(--neg, #EF4958) 42%, var(--track))';

// Grid novo da Visão do ato: os 6 cards (Mapa/Agentes/Precisão/Ataque-
// defesa/Armas/Funções) em 2 colunas de 3, todos com essa mesma altura fixa
// (com scroll por dentro quando não couber) -- Partidas + RR, empilhados na
// coluna da esquerda, dividem entre si a altura total dessas 3 linhas.
const SEASON_CARD_HEIGHT = 320;
const SEASON_CARD_GAP = 16;
const SEASON_COL_HEIGHT = 3 * SEASON_CARD_HEIGHT + 2 * SEASON_CARD_GAP;
const SEASON_MATCHES_HEIGHT = Math.round((SEASON_COL_HEIGHT - SEASON_CARD_GAP) / 2);
const SEASON_RR_HEIGHT = SEASON_COL_HEIGHT - SEASON_CARD_GAP - SEASON_MATCHES_HEIGHT;

// Cor de referência por função — mesma linguagem visual usada no resto do
// app (vitória/teal, derrota/vermelho), sem depender de uma cor de agente
// específico (várias funções têm agentes de cores bem diferentes).
const ROLE_COLORS: Record<string, string> = {
  Duelista: '#4FD1E8',
  Controlador: 'var(--neg, #EF4958)',
  Sentinela: 'var(--pos, #18AAB7)',
  Iniciador: 'var(--text-2)',
};

// Categoria de cada arma (fixo — nomenclatura do próprio jogo, não muda com
// os dados). A HenrikDev não devolve essa categoria pronta em nenhum lugar
// que a gente já lê.
const WEAPON_CATEGORY: Record<string, string> = {
  Classic: 'Pistolas',
  Shorty: 'Pistolas',
  Frenzy: 'Pistolas',
  Ghost: 'Pistolas',
  Sheriff: 'Pistolas',
  Stinger: 'Submetralhadoras',
  Spectre: 'Submetralhadoras',
  Bucky: 'Shotguns',
  Judge: 'Shotguns',
  Bulldog: 'Fuzis de assalto',
  Guardian: 'Fuzis de assalto',
  Phantom: 'Fuzis de assalto',
  Vandal: 'Fuzis de assalto',
  Marshal: 'Snipers',
  Outlaw: 'Snipers',
  Operator: 'Snipers',
  Ares: 'Metralhadoras',
  Odin: 'Metralhadoras',
  Melee: 'Corpo a corpo',
};

// Ataque/defesa — % de rounds ganhos em cada lado, no período (e sob o filtro
// de mapa/agente atual). Mesmo visual do card que já existia no dashboard
// de 30 dias, só que alimentado por SeasonOverview.attackDefense.
function AttackDefenseCard({ sides, height }: { sides: SeasonOverview['attackDefense']; height?: number }) {
  return (
    <div className="season-fixed-card" style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: height ? '0 0 auto' : 1, ...(height ? { height, overflow: 'hidden' } : {}) }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Ataque ou defesa</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>% de rounds ganhos em cada lado, no período</div>
      </div>
      {(
        [
          { label: 'Ataque', ...sides.attack },
          { label: 'Defesa', ...sides.defense },
          // Overtime não vem com winratePercent pronto (ver SidesBreakdown
          // em domain.ts, só wins/total) -- calcula aqui igual às outras
          // duas. Só entra na lista se teve overtime no período (senão
          // vira uma barra de 0/0 sem sentido).
          ...(sides.overtime.total > 0
            ? [{ label: 'Overtime', winratePercent: Math.round((sides.overtime.wins / sides.overtime.total) * 100), wins: sides.overtime.wins, total: sides.overtime.total }]
            : []),
        ] as Array<{ label: string; winratePercent: number; wins: number; total: number }>
      ).map((s) => (
        <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{s.label}</span>
            <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17 }}>{s.winratePercent}%</span>
          </div>
          <div style={{ height: 9, borderRadius: 5, background: 'var(--track)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${s.winratePercent}%`, borderRadius: 5, background: s.winratePercent >= 50 ? WIN : UNDER_50 }} />
            <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1, background: 'var(--text-faint)' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            {plural(s.wins, 'round')} ganho{s.wins === 1 ? '' : 's'} de {s.total}
          </span>
        </div>
      ))}
    </div>
  );
}

// Silhueta humana — cabeça/corpo/pernas, cada parte com sua cor (e,
// opcionalmente, opacidade pra indicar intensidade). Os 3 recortes (cabeça,
// "parte superior", "parte inferior") vieram prontos da Bruna — só empilha
// e recolore via `fill`/`fillOpacity`. `width` reaproveita o mesmo SVG em
// tamanhos diferentes (78px na Precisão, bem menor nas Armas).
function BodySilhouette({
  headColor,
  bodyColor,
  legColor,
  headOpacity = 1,
  bodyOpacity = 1,
  legOpacity = 1,
  width = 78,
}: {
  headColor: string;
  bodyColor: string;
  legColor: string;
  headOpacity?: number;
  bodyOpacity?: number;
  legOpacity?: number;
  width?: number;
}) {
  return (
    <svg viewBox="0 0 140 340" width={width} height={(width * 340) / 140} aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="70" cy="27.5" r="27.5" fill={headColor} fillOpacity={headOpacity} />
      <g transform="translate(10, 59)">
        <path
          d="M58.0001 133H61.0341H91.5001V36.0003C91.5001 34.5005 95.5001 33.5001 96.5001 36.0003V126C96.5001 131.5 112 139.5 119 126V36.0003C119.5 24.5002 114.7 1.2 91.5001 0H59.5332H59.501H27.5341C4.33411 1.2 -0.46589 24.5002 0.0341103 36.0003V126C7.03411 139.5 22.5341 131.5 22.5341 126V36.0003C23.5341 33.5001 27.5341 34.5005 27.5341 36.0003V133H58.0001Z"
          fill={bodyColor}
          fillOpacity={bodyOpacity}
        />
      </g>
      <g transform="translate(38, 197)">
        <path
          d="M0 126.265V0H64V126.265C55.8195 149.222 36.0902 135.747 36.0902 126.265L35.609 11.4786C35.609 10.4805 35.3684 8 32 8C29.2779 8 28.5514 10.1478 28.391 11.4786V126.265C23.5789 147.226 0 138.742 0 126.265Z"
          fill={legColor}
          fillOpacity={legOpacity}
        />
      </g>
    </svg>
  );
}

// Precisão cabeça/corpo/perna — visualizada como silhueta em vez da barra
// empilhada antiga, cada parte com sua cor e %.
function AccuracyBar({ accuracy, height }: { accuracy: SeasonOverview['accuracy']; height?: number }) {
  const segments = [
    { label: 'Cabeça', percent: accuracy.headPercent, hits: accuracy.headHits, color: 'var(--pos, #18AAB7)' },
    { label: 'Corpo', percent: accuracy.bodyPercent, hits: accuracy.bodyHits, color: 'var(--text-muted)' },
    { label: 'Perna', percent: accuracy.legPercent, hits: accuracy.legHits, color: 'var(--neg, #EF4958)' },
  ];
  return (
    <div className="season-fixed-card" style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: height ? '0 0 auto' : 1, ...(height ? { height, overflow: 'hidden' } : {}) }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Precisão</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Onde seus tiros acertaram no período — cabeça, corpo ou perna.</div>
      </div>
      <div className="accuracy-row" style={{ flex: 1 }}>
        <BodySilhouette headColor={segments[0]!.color} bodyColor={segments[1]!.color} legColor={segments[2]!.color} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: '0 0 auto', minWidth: 0 }}>
          {segments.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, color: 'var(--text-3)', width: 62, flex: 'none' }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: 'none' }} />
                {s.label}
              </span>
              <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 700 }}>
                {fmtNum(s.percent, 1)}% <span style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 400 }}>({plural(s.hits, 'tiro')})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Casca genérica pros 4 cards com scroll (Mapa/Agentes/Armas/Funções) --
// título/sub/resumo, o botão "Ver tudo" (só aparece quando `maxHeight` é
// passado) e o modal que reaproveita o mesmo `children`, só que chamado com
// `scrollable=false` (lista completa, sem limite de altura/scroll). Cada
// card só precisa passar sua lista como uma função de `scrollable`.
function ExpandableCard({
  title,
  sub,
  headerExtra,
  maxHeight,
  footer,
  children,
}: {
  title: string;
  sub: string;
  headerExtra?: ReactNode;
  maxHeight?: number;
  footer?: ReactNode;
  children: (scrollable: boolean) => ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  return (
    <>
      <div className="season-fixed-card" style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, ...(maxHeight ? { height: maxHeight, overflow: 'hidden' } : {}) }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {maxHeight && (
              <button
                onClick={() => setShowAll(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--acc, #EF4958)', whiteSpace: 'nowrap' }}
              >
                Ver tudo
              </button>
            )}
            {headerExtra}
          </div>
        </div>
        {children(true)}
        {footer}
      </div>

      {showAll && (
        <Modal onClose={() => setShowAll(false)} width={620}>
          <ModalHeader title={title} onClose={() => setShowAll(false)} />
          {children(false)}
          {footer}
        </Modal>
      )}
    </>
  );
}

// Funções — cada uma com seu winrate (V–D), KDA (com os abates/mortes/
// assistências absolutos ao lado) e uma barra de progresso colorida pela
// própria função, em vez da lista compacta genérica que os outros cards
// (Mapa/Armas) usam -- tem informação demais aqui pra caber numa linha só.
function RoleBlock({ roles, maxHeight }: { roles: SeasonOverview['roles']; maxHeight?: number }) {
  return (
    <ExpandableCard
      title="Funções"
      sub="Winrate por função no período"
      maxHeight={maxHeight}
      footer={
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 9, display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: 'var(--text-faint)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 5, borderRadius: 3, background: LOW_SAMPLE, flex: 'none' }} />
            menos de {MIN_SAMPLE} partidas: amostra pequena
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 5, borderRadius: 3, background: UNDER_50, flex: 'none' }} />
            abaixo de 50%
          </span>
          <span>KDA: abates / mortes / assistências</span>
        </div>
      }
    >
      {(scrollable) =>
        roles.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', ...(scrollable ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}) }}>
            {roles.map((r, i) => {
              const color = ROLE_COLORS[r.role] ?? 'var(--text-2)';
              const lowSample = r.matches < MIN_SAMPLE;
              const wrColor = lowSample ? LOW_SAMPLE : r.winratePercent >= 50 ? WIN : UNDER_50;
              return (
                <div key={r.role} style={{ padding: '12px 0', borderTop: i > 0 ? '1px solid var(--divider)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 14, color }}>{r.role}</span>
                      <span style={{ fontSize: 10, letterSpacing: '.06em', color: 'var(--text-faint)' }}>WR</span>
                      <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 17, color: wrColor }}>{r.winratePercent}%</span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                        {r.wins}V–{r.losses}D
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 10, letterSpacing: '.06em', color: 'var(--text-faint)' }}>KDA</span>
                      <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 15 }}>{fmtNum(r.kda, 2)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {r.kills} / {r.deaths} / {r.assists}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--track)', marginTop: 8 }}>
                    <div style={{ height: '100%', width: `${r.winratePercent}%`, borderRadius: 3, background: lowSample ? LOW_SAMPLE : color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    {lowSample && <span style={{ width: 6, height: 6, borderRadius: '50%', background: LOW_SAMPLE, flex: 'none' }} />}
                    <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{plural(r.matches, 'partida')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </ExpandableCard>
  );
}

// Armas — ranking numerado (destaque dourado no 1º), nome + categoria,
// silhueta pequena (mesma da Precisão) mostrando a distribuição de acertos
// daquela arma via opacidade de cada parte, e abates com barra relativa à
// arma mais usada.
function WeaponBlock({ weapons, maxHeight }: { weapons: SeasonOverview['topWeapons']; maxHeight?: number }) {
  const maxKills = Math.max(1, ...weapons.map((w) => w.kills));

  return (
    <ExpandableCard
      title="Armas mais usadas"
      sub="Abates e distribuição de acertos por arma no período"
      maxHeight={maxHeight}
      footer={
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 9, display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: 'var(--text-faint)' }}>
          <span>Barra: abates relativos à arma mais usada</span>
          <span>Boneco: intensidade por região de acerto</span>
        </div>
      }
    >
      {(scrollable) =>
        weapons.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', ...(scrollable ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}) }}>
            {weapons.map((w, i) => {
              const isFirst = i === 0;
              const color = isFirst ? GOLD : 'var(--pos, #18AAB7)';
              const killRatio = w.kills / maxKills;
              return (
                <div key={w.weapon} className="weapon-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i > 0 ? '1px solid var(--divider)' : 'none' }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      flex: 'none',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: isFirst ? GOLD : 'var(--text-faint)',
                      background: isFirst ? `color-mix(in srgb, ${GOLD} 18%, transparent)` : 'var(--track)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 14, color: isFirst ? GOLD : 'var(--text)' }}>{w.weapon}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{WEAPON_CATEGORY[w.weapon] ?? 'Arma'}</div>
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flex: 'none' }}>
                    <BodySilhouette
                      width={22}
                      headColor={color}
                      bodyColor={color}
                      legColor={color}
                      headOpacity={Math.max(0.22, w.headPercent / 100)}
                      bodyOpacity={Math.max(0.22, w.bodyPercent / 100)}
                      legOpacity={Math.max(0.22, w.legPercent / 100)}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: 11.5, color: 'var(--text-faint)', flex: 'none' }}>
                      <span>
                        {fmtNum(w.headPercent, 0)}% <span style={{ color: 'var(--text-3)' }}>cabeça</span>
                      </span>
                      <span>
                        {fmtNum(w.bodyPercent, 0)}% <span style={{ color: 'var(--text-3)' }}>corpo</span>
                      </span>
                      <span>
                        {fmtNum(w.legPercent, 0)}% <span style={{ color: 'var(--text-3)' }}>pernas</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', width: 78, flex: 'none' }}>
                      <span style={{ fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>ABATES</span>
                      <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 20 }}>{w.kills}</span>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--track)' }}>
                        <div style={{ height: '100%', width: `${killRatio * 100}%`, borderRadius: 2, background: color }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </ExpandableCard>
  );
}

// Mapa — ranking numerado (destaque dourado no 1º), nome, barra de
// progresso pela % de vitória e V–D à direita. Cabeçalho ganha o resumo
// geral (V–D total · nº de partidas) ao lado do título, como Agentes.
function MapBlock({ maps, maxHeight }: { maps: SeasonOverview['topMaps']; maxHeight?: number }) {
  const totalWins = maps.reduce((s, m) => s + m.wins, 0);
  const totalMatches = maps.reduce((s, m) => s + m.total, 0);

  return (
    <ExpandableCard
      title="Mapa"
      sub="Vitórias no período"
      maxHeight={maxHeight}
      headerExtra={
        <span style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
          {totalWins}V–{totalMatches - totalWins}D · {plural(totalMatches, 'partida')}
        </span>
      }
      footer={
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 9, display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: 'var(--text-faint)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 5, borderRadius: 3, background: LOW_SAMPLE, flex: 'none' }} />
            menos de {MIN_SAMPLE} partidas: amostra pequena
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 5, borderRadius: 3, background: UNDER_50, flex: 'none' }} />
            abaixo de 50%
          </span>
        </div>
      }
    >
      {(scrollable) =>
        maps.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...(scrollable ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}) }}>
            {maps.map((m, i) => {
              const isFirst = i === 0;
              const lowSample = m.total < MIN_SAMPLE;
              const color = isFirst ? GOLD : lowSample ? LOW_SAMPLE : m.winratePercent >= 50 ? WIN : UNDER_50;
              return (
                <div key={m.map} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      flex: 'none',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: isFirst ? GOLD : 'var(--text-faint)',
                      background: isFirst ? `color-mix(in srgb, ${GOLD} 18%, transparent)` : 'var(--track)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13.5, color: isFirst ? GOLD : 'var(--text)', flex: 'none', width: 62, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {m.map}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 3, background: 'var(--track)' }}>
                    <div style={{ height: '100%', width: `${m.winratePercent}%`, borderRadius: 3, background: color }} />
                  </div>
                  <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 14, color, width: 36, textAlign: 'right', flex: 'none' }}>{m.winratePercent}%</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', flex: 'none', width: 52, textAlign: 'right' }}>
                    {m.wins}V · {m.total - m.wins}D
                  </span>
                </div>
              );
            })}
          </div>
        )
      }
    </ExpandableCard>
  );
}

// Agentes — mesmo padrão do Mapa (ranking, barra de WR), com um mini-grid
// K/D · ADR · ACS · DDΔ · melhor mapa abaixo de cada linha. Aceita
// `maxHeight` porque, na posição "de baixo" (ao lado de Armas/Funções),
// não deve crescer mais que os outros dois — rola por dentro.
function AgentBlock({ agents, agentIcons, maxHeight }: { agents: SeasonOverview['topAgents']; agentIcons: Record<string, string>; maxHeight?: number }) {
  const totalMatches = agents.reduce((s, a) => s + a.matches, 0);

  return (
    <ExpandableCard
      title="Agentes"
      sub="Winrate e desempenho por agente no período"
      maxHeight={maxHeight}
      headerExtra={
        <span style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
          {plural(agents.length, 'agente')} · {plural(totalMatches, 'partida')}
        </span>
      }
      footer={
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 9, display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: 'var(--text-faint)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 5, borderRadius: 3, background: LOW_SAMPLE, flex: 'none' }} />
            menos de {MIN_SAMPLE} partidas: amostra pequena
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 5, borderRadius: 3, background: UNDER_50, flex: 'none' }} />
            abaixo de 50%
          </span>
        </div>
      }
    >
      {(scrollable) =>
        agents.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sem dados ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...(scrollable ? { flex: 1, minHeight: 0, overflowY: 'auto' } : {}) }}>
            {agents.map((a, i) => {
              const isFirst = i === 0;
              const lowSample = a.matches < MIN_SAMPLE;
              const color = isFirst ? GOLD : lowSample ? LOW_SAMPLE : a.winratePercent >= 50 ? WIN : UNDER_50;
              return (
                <div key={a.agent} style={{ padding: '10px 18px', margin: '0 -18px', borderRadius: 8, background: i % 2 === 1 ? 'var(--track)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        flex: 'none',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: isFirst ? GOLD : 'var(--text-faint)',
                        background: isFirst ? `color-mix(in srgb, ${GOLD} 18%, transparent)` : 'var(--track)',
                      }}
                    >
                      {i + 1}
                    </span>
                    {agentIcons[a.agent] && <img src={agentIcons[a.agent]} alt="" style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'contain', background: 'var(--track)', flex: 'none' }} />}
                    <div style={{ minWidth: 110, flex: 'none' }}>
                      <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 13.5, color: isFirst ? GOLD : 'var(--text)' }}>{a.agent}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
                        {plural(a.matches, 'partida')} · {formatPlaytime(a.playtimeMs)}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 3, background: 'var(--track)' }}>
                      <div style={{ height: '100%', width: `${a.winratePercent}%`, borderRadius: 3, background: color }} />
                    </div>
                    <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 14, color, width: 36, textAlign: 'right', flex: 'none' }}>{a.winratePercent}%</span>
                  </div>
                  <div className="agent-stat-grid" style={{ gap: 8, marginTop: 9 }}>
                    {[
                      { label: 'K/D', value: fmtNum(a.kd, 2) },
                      { label: 'ADR', value: fmtNum(a.adr, 1) },
                      { label: 'ACS', value: fmtNum(a.acs, 1) },
                      { label: 'DDΔ', value: fmtDelta(a.ddPerRound, 0), color: a.ddPerRound >= 0 ? WIN : LOSS },
                      { label: 'Melhor mapa', value: a.bestMap ? `${a.bestMap.map} ${a.bestMap.winratePercent}%` : '—' },
                    ].map((s) => (
                      <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 9, letterSpacing: '.06em', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{s.label.toUpperCase()}</span>
                        <span
                          style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 13, color: s.color ?? 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </ExpandableCard>
  );
}

export function SeasonOverviewSection({
  data,
  loading,
  error,
  matchesPage,
  matchesLoading,
  matchesError,
  setMatchesPageNumber,
  rrHistory,
  rrHistoryLoading,
  rrFormInsights,
  modoFilter,
  subject = 'você',
}: {
  data: SeasonOverview | null;
  loading: boolean;
  error: string | null;
  matchesPage: SeasonMatchesPage | null;
  matchesLoading: boolean;
  matchesError: string | null;
  setMatchesPageNumber: (page: number) => void;
  rrHistory: RrHistoryPoint[];
  rrHistoryLoading: boolean;
  rrFormInsights: RecentFormInsights | null;
  modoFilter: MatchModeFilter;
  subject?: string;
}) {
  if (loading) return <LoadingFill />;
  if (error) return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>{error}</div>;
  if (!data) {
    return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>Sem dados ainda.</div>;
  }

  if (data.matchesCount === 0) {
    return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>Nenhuma partida encontrada com esse filtro.</div>;
  }

  // `ratio` é só uma referência visual (não um recorde real) pra dar noção
  // de "cheio"/"vazio" na barrinha de cada stat -- ADR/K/D/KDA usam um teto
  // razoável pro jogo, as que já são % usam a própria %.
  const heroStats: Array<{ label: string; value: string; explain: string; ratio: number }> = [
    { label: 'ADR', value: String(data.adr), explain: 'Dano médio causado por round no período.', ratio: Math.min(1, data.adr / 300) },
    {
      label: 'K/D',
      value: data.deaths > 0 ? fmtNum(data.kills / data.deaths, 2) : String(data.kills),
      explain: 'Abates divididos pelas mortes, no período.',
      ratio: Math.min(1, (data.deaths > 0 ? data.kills / data.deaths : data.kills) / 2.5),
    },
    { label: 'Headshot %', value: `${fmtNum(data.hsPercent, 1)}%`, explain: 'Dos seus tiros que acertaram, quantos foram na cabeça.', ratio: Math.min(1, data.hsPercent / 100) },
    {
      label: 'Win %',
      value: `${data.winratePercent}%`,
      explain: `${plural(data.wins, 'vitória')} em ${plural(data.matchesCount, 'partida')} no período.`,
      ratio: Math.min(1, data.winratePercent / 100),
    },
    { label: 'KDA', value: fmtNum(data.kda, 2), explain: 'Abates mais assistências divididos pelas mortes, por partida em média.', ratio: Math.min(1, data.kda / 3) },
    { label: 'V/D', value: `${data.wins}V–${data.losses}D`, explain: 'Vitórias e derrotas somadas no período.', ratio: Math.min(1, data.winratePercent / 100) },
  ];

  const miniStats: Array<{ label: string; value: string; explain: string }> = [
    { label: 'ACS', value: String(data.acs), explain: 'Pontuação de combate por round, considerando todo o ato.' },
    { label: 'DDΔ/round', value: fmtDelta(data.ddPerRound, 1), explain: 'Quanto de dano a mais (ou a menos) você fez por round, comparado à média dos outros 9 jogadores das mesmas partidas.' },
    { label: 'Abates', value: String(data.kills), explain: 'Total de abates no período.' },
    { label: 'Mortes', value: String(data.deaths), explain: 'Total de mortes no período.' },
    { label: 'Assistências', value: String(data.assists), explain: 'Total de assistências no período.' },
    { label: 'First bloods', value: String(data.firstBloods), explain: 'Primeiro abate da rodada, contando só as vezes que foi você.' },
    { label: 'Aces', value: String(data.aces), explain: 'Rodadas em que você fez os 5 abates da equipe adversária sozinho.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="kpi-hero-row">
          {heroStats.map((s, i) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minWidth: 0,
                flex: '1 1 140px',
                paddingRight: i < heroStats.length - 1 ? 20 : 0,
                borderRight: i < heroStats.length - 1 ? '1px solid var(--divider)' : 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--pos, #18AAB7)' }}>
                {s.label}
                <InfoDot text={s.explain} />
              </span>
              <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: '-.02em' }}>{s.value}</span>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--track)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${s.ratio * 100}%`, borderRadius: 2, background: 'var(--pos, #18AAB7)' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="kpi-mini-row">
          {miniStats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                {s.label}
                <InfoDot text={s.explain} />
              </span>
              <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Duas colunas iguais (1fr 1fr): à esquerda Partidas + RR empilhados
          (juntos somam a mesma altura da coluna de cards, ver constantes
          SEASON_* acima); à direita os 6 cards em 2 sub-colunas de 3, gap
          bem pequeno (4px) entre elas -- como as duas colunas externas têm
          exatamente a mesma largura (1fr cada), a largura de Partidas/RR
          bate com a soma das 2 sub-colunas de cards + esse gap de 4px. */}
      <div className="grid-responsive-season">
        {/* minWidth:0 é o que importa aqui -- sem isso, um item de grid
            "herda" a largura mínima do conteúdo mais largo lá dentro (o
            min-width:560 do modo Detalhado da lista de partidas), fazendo a
            COLUNA inteira crescer pra caber, em vez de travar na largura
            disponível e deixar só o .scroll-x-mobile (por dentro do card)
            rolar de lado -- ver comentário em .app-shell-grid/.app-main no
            index.css pra a mesma ideia aplicada no nível de página. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SEASON_CARD_GAP, minWidth: 0 }}>
          <SeasonMatchesList
            matchesPage={matchesPage}
            loading={matchesLoading}
            error={matchesError}
            mapIcons={data.mapIcons}
            agentIcons={data.agentIcons}
            setPage={setMatchesPageNumber}
            height={SEASON_MATCHES_HEIGHT}
          />
          <RrHistoryCard
            rrHistory={rrHistory}
            rrHistoryLoading={rrHistoryLoading}
            formInsights={rrFormInsights}
            subject={subject}
            noRankedHistory={modoFilter === 'Unrated'}
            currentRank={data.currentRank}
            height={SEASON_RR_HEIGHT}
          />
        </div>

        <div className="season-cards-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: SEASON_CARD_GAP, minWidth: 0 }}>
            <MapBlock maps={data.topMaps} maxHeight={SEASON_CARD_HEIGHT} />
            <AgentBlock agents={data.topAgents} agentIcons={data.agentIcons} maxHeight={SEASON_CARD_HEIGHT} />
            <AttackDefenseCard sides={data.attackDefense} height={SEASON_CARD_HEIGHT} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SEASON_CARD_GAP, minWidth: 0 }}>
            <AccuracyBar accuracy={data.accuracy} height={SEASON_CARD_HEIGHT} />
            <WeaponBlock weapons={data.topWeapons} maxHeight={SEASON_CARD_HEIGHT} />
            <RoleBlock roles={data.roles} maxHeight={SEASON_CARD_HEIGHT} />
          </div>
        </div>
      </div>
    </div>
  );
}
