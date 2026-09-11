import type { SeasonMatchesPage, SeasonOverview } from '@callout/shared';
import { LoadingFill } from './Spinner';
import { SeasonMatchesList } from './SeasonMatchesList';
import { cardStyle, fmtNum, fmtDelta, plural, rateBarColor, RateBlock, RankingBlock } from './statsPrimitives';
import { formatSeasonShort } from '../lib/seasonFormat';

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
function AttackDefenseCard({ sides }: { sides: SeasonOverview['attackDefense'] }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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

// Barra de precisão cabeça/corpo/perna — mesma lógica de barra empilhada que
// o resto do app usa pra winrate, só com 3 segmentos em vez de 1.
function AccuracyBar({ accuracy }: { accuracy: SeasonOverview['accuracy'] }) {
  const segments = [
    { label: 'Cabeça', percent: accuracy.headPercent, hits: accuracy.headHits, color: 'var(--pos, #18AAB7)' },
    { label: 'Corpo', percent: accuracy.bodyPercent, hits: accuracy.bodyHits, color: 'var(--text-muted)' },
    { label: 'Perna', percent: accuracy.legPercent, hits: accuracy.legHits, color: 'var(--neg, #EF4958)' },
  ];
  return (
    <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>Precisão</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>Onde seus tiros acertaram no ato — cabeça, corpo ou perna.</div>
      </div>
      <div style={{ height: 10, borderRadius: 5, display: 'flex', overflow: 'hidden', background: 'var(--track)' }}>
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${s.percent}%`, background: s.color }} title={`${s.label}: ${s.percent}%`} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              {s.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {fmtNum(s.percent, 1)}% <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 400 }}>({plural(s.hits, 'tiro')})</span>
            </span>
          </div>
        ))}
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
  subject = 'você',
}: {
  data: SeasonOverview | null;
  loading: boolean;
  error: string | null;
  matchesPage: SeasonMatchesPage | null;
  matchesLoading: boolean;
  matchesError: string | null;
  setMatchesPageNumber: (page: number) => void;
  subject?: string;
}) {
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

      <div className="grid-responsive-season">
        <SeasonMatchesList
          matchesPage={matchesPage}
          loading={matchesLoading}
          error={matchesError}
          mapIcons={data.mapIcons}
          agentIcons={data.agentIcons}
          setPage={setMatchesPageNumber}
          formInsights={data.formInsights}
          subject={subject}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          />
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
          <AttackDefenseCard sides={data.attackDefense} />
        </div>
      </div>

      {/* Cards adicionais — sobram depois da lista de partidas, "encaixados"
          lado a lado em vez de ficarem perdidos no fim da página. */}
      <div className="grid-responsive-3">
        <AccuracyBar accuracy={data.accuracy} />
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
    </div>
  );
}
