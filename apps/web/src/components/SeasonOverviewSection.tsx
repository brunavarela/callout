import { useRef, useState } from 'react';
import type { MatchCountFilter, MatchModeFilter, RecentFormInsights, RrHistoryPoint, SeasonMatchesPage, SeasonOverview } from '@callout/shared';
import { LoadingFill } from './Spinner';
import { SeasonMatchesList } from './SeasonMatchesList';
import { RrHistoryCard } from './RrHistoryCard';
import { cardStyle, fmtNum, fmtDelta, plural, rateBarColor, RateBlock, RankingBlock } from './statsPrimitives';
import { formatSeasonShort } from '../lib/seasonFormat';
import { useFlip } from '../lib/useFlip';

export { formatSeasonShort, formatPlaytime } from '../lib/seasonFormat';

const WIN = 'var(--pos, #18AAB7)';
const UNDER_50 = 'color-mix(in srgb, var(--neg, #EF4958) 42%, var(--track))';

// "?" ao lado do título de cada stat — passa o mouse (ou foca via teclado)
// pra ver a legenda numa bolha no estilo do resto do app, em vez do
// tooltip nativo do navegador.
function InfoDot({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0}>
      <span className="info-dot">?</span>
      <span className="info-tip-bubble">{text}</span>
    </span>
  );
}

// Ataque/defesa — % de rounds ganhos em cada lado, no ato (e sob o filtro
// de mapa/agente atual). Mesmo visual do card que já existia no dashboard
// de 30 dias, só que alimentado por SeasonOverview.attackDefense.
function AttackDefenseCard({ sides, grow = true }: { sides: SeasonOverview['attackDefense']; grow?: boolean }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: grow ? 1 : '0 0 auto', justifyContent: 'center' }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Ataque ou defesa</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>% de rounds ganhos em cada lado, no ato</div>
      </div>
      {(
        [
          { label: 'Ataque', ...sides.attack },
          { label: 'Defesa', ...sides.defense },
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
      {sides.overtime.total > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          + overtime: {sides.overtime.wins} de {sides.overtime.total} rounds
        </div>
      )}
    </div>
  );
}

// Silhueta humana — cabeça/corpo/pernas com a mesma cor de sempre (teal/
// cinza/vermelho, ver AccuracyBreakdown), cada parte com sua % de tiros ao
// lado. Os 3 recortes (cabeça, "parte superior", "parte inferior") vieram
// prontos da Bruna — só empilha e recolore via `fill`.
function BodySilhouette({ headColor, bodyColor, legColor }: { headColor: string; bodyColor: string; legColor: string }) {
  return (
    <svg viewBox="0 0 140 340" width={78} height={189} aria-hidden="true">
      <circle cx="70" cy="27.5" r="27.5" fill={headColor} />
      <g transform="translate(10, 59)">
        <path
          d="M58.0001 133H61.0341H91.5001V36.0003C91.5001 34.5005 95.5001 33.5001 96.5001 36.0003V126C96.5001 131.5 112 139.5 119 126V36.0003C119.5 24.5002 114.7 1.2 91.5001 0H59.5332H59.501H27.5341C4.33411 1.2 -0.46589 24.5002 0.0341103 36.0003V126C7.03411 139.5 22.5341 131.5 22.5341 126V36.0003C23.5341 33.5001 27.5341 34.5005 27.5341 36.0003V133H58.0001Z"
          fill={bodyColor}
        />
      </g>
      <g transform="translate(38, 197)">
        <path
          d="M0 126.265V0H64V126.265C55.8195 149.222 36.0902 135.747 36.0902 126.265L35.609 11.4786C35.609 10.4805 35.3684 8 32 8C29.2779 8 28.5514 10.1478 28.391 11.4786V126.265C23.5789 147.226 0 138.742 0 126.265Z"
          fill={legColor}
        />
      </g>
    </svg>
  );
}

// Precisão cabeça/corpo/perna — visualizada como silhueta em vez da barra
// empilhada antiga, cada parte com sua cor e %.
function AccuracyBar({ accuracy, grow = true }: { accuracy: SeasonOverview['accuracy']; grow?: boolean }) {
  const segments = [
    { label: 'Cabeça', percent: accuracy.headPercent, hits: accuracy.headHits, color: 'var(--pos, #18AAB7)' },
    { label: 'Corpo', percent: accuracy.bodyPercent, hits: accuracy.bodyHits, color: 'var(--text-muted)' },
    { label: 'Perna', percent: accuracy.legPercent, hits: accuracy.legHits, color: 'var(--neg, #EF4958)' },
  ];
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: grow ? 1 : '0 0 auto', justifyContent: 'center' }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Precisão</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Onde seus tiros acertaram no ato — cabeça, corpo ou perna.</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <BodySilhouette headColor={segments[0]!.color} bodyColor={segments[1]!.color} legColor={segments[2]!.color} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 0 }}>
          {segments.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flex: 'none' }} />
                {s.label}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                {fmtNum(s.percent, 1)}% <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 400 }}>({plural(s.hits, 'tiro')})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  matchCountFilter,
  setMatchCountFilter,
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
  matchCountFilter: MatchCountFilter;
  setMatchCountFilter: (n: MatchCountFilter) => void;
  modoFilter: MatchModeFilter;
  subject?: string;
}) {
  const [compact, setCompact] = useState(false);
  const registerCard = useFlip(compact);

  // Mapa/Armas/Funções, no modo compacto, ganham a mesma altura do card de
  // Agentes (medida ao vivo, já que a altura dele é dinâmica -- depende de
  // quantos agentes distintos a pessoa jogou) -- com scroll por dentro se o
  // conteúdo não couber. Ref callback (não useEffect com []) porque esse
  // card só existe de fato depois que `data` chega -- um efeito de
  // montagem rodaria antes disso, com a ref ainda nula, e nunca mais.
  const agentesObserver = useRef<ResizeObserver | null>(null);
  const [agentesHeight, setAgentesHeight] = useState<number | undefined>(undefined);
  const setAgentesRef = (el: HTMLDivElement | null) => {
    agentesObserver.current?.disconnect();
    agentesObserver.current = null;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAgentesHeight(entry.contentRect.height);
    });
    observer.observe(el);
    agentesObserver.current = observer;
  };

  if (loading) return <LoadingFill />;
  if (error) return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>{error}</div>;
  if (!data) {
    return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>Sem dados de ato ainda.</div>;
  }

  if (data.matchesCount === 0) {
    return (
      <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
        {data.seasonShort ? `Nenhuma partida encontrada em ${formatSeasonShort(data.seasonShort)} com esse filtro.` : 'Sem dados desse ato ainda.'}
      </div>
    );
  }

  const heroStats: Array<{ label: string; value: string; explain: string }> = [
    { label: 'ADR', value: String(data.adr), explain: 'Dano médio causado por round no ato.' },
    { label: 'K/D', value: data.deaths > 0 ? fmtNum(data.kills / data.deaths, 2) : String(data.kills), explain: 'Abates divididos pelas mortes, no ato.' },
    { label: 'Headshot %', value: `${fmtNum(data.hsPercent, 1)}%`, explain: 'Dos seus tiros que acertaram, quantos foram na cabeça.' },
    { label: 'Win %', value: `${data.winratePercent}%`, explain: `${plural(data.wins, 'vitória')} em ${plural(data.matchesCount, 'partida')} no ato.` },
    { label: 'KDA', value: fmtNum(data.kda, 2), explain: 'Abates mais assistências divididos pelas mortes, por partida em média.' },
    { label: 'V/D', value: `${data.wins}V–${data.losses}D`, explain: 'Vitórias e derrotas somadas no ato.' },
  ];

  const miniStats: Array<{ label: string; value: string; explain: string }> = [
    { label: 'ACS', value: String(data.acs), explain: 'Pontuação de combate por round, considerando todo o ato.' },
    { label: 'DDΔ/round', value: fmtDelta(data.ddPerRound, 1), explain: 'Quanto de dano a mais (ou a menos) você fez por round, comparado à média dos outros 9 jogadores das mesmas partidas.' },
    { label: 'Abates', value: String(data.kills), explain: 'Total de abates no ato.' },
    { label: 'Mortes', value: String(data.deaths), explain: 'Total de mortes no ato.' },
    { label: 'Assistências', value: String(data.assists), explain: 'Total de assistências no ato.' },
    { label: 'First bloods', value: String(data.firstBloods), explain: 'Primeiro abate da rodada, contando só as vezes que foi você.' },
    { label: 'Aces', value: String(data.aces), explain: 'Rodadas em que você fez os 5 abates da equipe adversária sozinho.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="kpi-hero-row">
          {heroStats.map((s) => (
            <div key={s.label} style={{ display: 'flex', gap: 10, alignItems: 'stretch', minWidth: 0 }}>
              <span style={{ width: 3, borderRadius: 2, background: 'var(--acc, #EF4958)', flex: 'none' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
                  {s.label}
                  <InfoDot text={s.explain} />
                </span>
                <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: '-.02em' }}>{s.value}</span>
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

      <RrHistoryCard
        rrHistory={rrHistory}
        rrHistoryLoading={rrHistoryLoading}
        formInsights={rrFormInsights}
        matchCountFilter={matchCountFilter}
        setMatchCountFilter={setMatchCountFilter}
        subject={subject}
        noRankedHistory={modoFilter === 'Unrated'}
        currentRank={data.currentRank}
      />

      <div className="grid-responsive-season">
        {/* Coluna da esquerda: a lista de partidas, sozinha (modo normal) ou
            encolhida ao lado dos cards de Mapa/Armas/Funções (modo
            compacto, em 2 colunas do mesmo tamanho da sidebar) -- só essa
            coluna reflui; a sidebar (Agentes/Precisão/Ataque-defesa) ao
            lado é sempre estática. */}
        <div className="season-left-row">
          <div ref={registerCard('partidas')} style={{ flex: compact ? '0 0 190px' : '1 1 auto' }}>
            <SeasonMatchesList
              matchesPage={matchesPage}
              loading={matchesLoading}
              error={matchesError}
              mapIcons={data.mapIcons}
              agentIcons={data.agentIcons}
              setPage={setMatchesPageNumber}
              compact={compact}
              setCompact={setCompact}
              style={{ flex: 1 }}
            />
          </div>

          {compact && (
            <div className="season-rise-grid">
              <div ref={registerCard('funcoes')} style={{ gridColumn: 2, gridRow: 1 }}>
                <RateBlock
                  title="Funções"
                  sub="Winrate por função no ato"
                  rows={data.roles.map((r) => ({ key: r.role, name: r.role, wins: r.wins, total: r.matches }))}
                  colorFor={rateBarColor}
                  maxHeight={agentesHeight}
                />
              </div>
              <div ref={registerCard('armas')} style={{ gridColumn: 2, gridRow: 2 }}>
                <RankingBlock
                  title="Armas mais usadas"
                  sub="Abates por arma no ato"
                  rows={data.topWeapons.map((w) => ({ key: w.weapon, name: w.weapon, value: plural(w.kills, 'abate') }))}
                  maxHeight={agentesHeight}
                />
              </div>
              <div ref={registerCard('mapa')} style={{ gridColumn: 2, gridRow: 3 }}>
                <RankingBlock
                  title="Mapa"
                  sub="Vitórias no ato"
                  rows={data.topMaps.map((m) => ({
                    key: m.map,
                    name: m.map,
                    value: `${m.wins}V · ${m.total - m.wins}D`,
                    caption: `${m.winratePercent}% de winrate`,
                    icon: data.mapIcons[m.map],
                  }))}
                  maxHeight={agentesHeight}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar fixa -- nunca se move nem redimensiona com o toggle
            Detalhado/Compacto. Só o `flex`/height de esticar (que serve pra
            somar a altura dos 3 cards com a altura da lista de partidas no
            modo normal) é desligado no compacto -- senão o card de Agentes
            fica maior do que seu conteúdo natural (esticado pra preencher a
            linha do grid), e como Mapa/Armas/Funções copiam a altura DELE,
            isso cria um ciclo (a altura deles cresce, o que estica Agentes
            de novo, e por aí vai) até estabilizar num valor errado. Sem
            esticar, a altura medida de Agentes é sempre a de verdade. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: compact ? undefined : '100%' }}>
          <div ref={setAgentesRef} style={{ display: 'flex', flexDirection: 'column', flex: compact ? '0 0 auto' : 1 }}>
            <RankingBlock
              title="Agentes"
              sub="Winrate no ato"
              rows={data.topAgents.slice(0, 6).map((a) => ({
                key: a.agent,
                name: a.agent,
                value: `${a.winratePercent}%`,
                caption: `${plural(a.matches, 'partida')} · KD ${fmtNum(a.kda, 2)}`,
                icon: data.agentIcons[a.agent],
                dot: a.color,
              }))}
              style={{ flex: compact ? undefined : 1 }}
            />
          </div>
          <AccuracyBar accuracy={data.accuracy} grow={!compact} />
          <AttackDefenseCard sides={data.attackDefense} grow={!compact} />
        </div>
      </div>

      {/* Fora do modo compacto, Mapa/Armas/Funções ficam abaixo, em vez de
          "em cima" ao lado da lista de partidas encolhida. */}
      {!compact && (
        <div className="grid-responsive-3">
          <RankingBlock
            title="Mapa"
            sub="Vitórias no ato"
            rows={data.topMaps.map((m) => ({
              key: m.map,
              name: m.map,
              value: `${m.wins}V · ${m.total - m.wins}D`,
              caption: `${m.winratePercent}% de winrate`,
              icon: data.mapIcons[m.map],
            }))}
          />
          <RankingBlock
            title="Armas mais usadas"
            sub="Abates por arma no ato"
            rows={data.topWeapons.map((w) => ({ key: w.weapon, name: w.weapon, value: plural(w.kills, 'abate') }))}
          />
          <RateBlock
            title="Funções"
            sub="Winrate por função no ato"
            rows={data.roles.map((r) => ({ key: r.role, name: r.role, wins: r.wins, total: r.matches }))}
            colorFor={rateBarColor}
          />
        </div>
      )}
    </div>
  );
}
