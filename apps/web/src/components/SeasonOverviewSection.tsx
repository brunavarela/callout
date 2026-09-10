import type { SeasonOverview } from '@callout/shared';
import { LoadingFill } from './Spinner';
import { cardStyle, fmtNum, fmtDelta, plural, rateBarColor, RateBlock, RankingBlock } from './statsPrimitives';

function formatPlaytime(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)}min`;
  return `${fmtNum(hours, hours < 10 ? 1 : 0)}h`;
}

// A HenrikDev devolve o "short" do ato em código interno ("e11a5" =
// episódio 11, ato 5), não no formato bonito que aparece no cliente do
// jogo — só deixa mais legível; se um dia o formato mudar, cai de volta
// pro valor bruto sem quebrar nada.
function formatSeasonShort(raw: string): string {
  const match = /^e(\d+)a(\d+)$/i.exec(raw);
  if (!match) return raw;
  return `Episódio ${match[1]} · Ato ${match[2]}`;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)' }}>{label.toUpperCase()}</span>
      <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 17 }}>{value}</span>
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

export function SeasonOverviewSection({ data, loading, error }: { data: SeasonOverview | null; loading: boolean; error: string | null }) {
  if (loading) return <LoadingFill />;
  if (error) return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>{error}</div>;
  if (!data || data.matchesCount === 0) {
    return (
      <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
        {data?.seasonShort ? `Nenhuma partida competitiva ainda em ${formatSeasonShort(data.seasonShort)}.` : 'Sem dados do ato atual ainda.'}
      </div>
    );
  }

  const kpiCards = [
    { label: 'ACS médio', value: String(data.acs), explain: 'Pontuação de combate por round, considerando todo o ato.' },
    { label: 'ADR', value: String(data.adr), explain: 'Dano médio causado por round no ato.' },
    { label: 'K/D/A', value: `${data.kills}/${data.deaths}/${data.assists}`, explain: 'Total de abates, mortes e assistências somados no ato.' },
    { label: 'HS%', value: `${fmtNum(data.hsPercent, 1)}%`, explain: 'Dos seus tiros que acertaram, quantos foram na cabeça.' },
    {
      label: 'DDΔ/round',
      value: fmtDelta(data.ddPerRound, 1),
      explain: 'Quanto de dano a mais (ou a menos) você fez por round, comparado à média dos outros 9 jogadores das mesmas partidas.',
    },
    { label: 'Vitórias', value: `${data.winratePercent}%`, explain: `${plural(data.wins, 'vitória')} em ${plural(data.matchesCount, 'partida')} no ato.` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, padding: '18px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28 }}>
        <div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 19 }}>
            {data.seasonShort ? formatSeasonShort(data.seasonShort) : 'Ato atual'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            {plural(data.matchesCount, 'partida')} · {formatPlaytime(data.playtimeMs)} jogadas
          </div>
        </div>
        {data.accountLevel !== null && <StatChip label="Nível" value={String(data.accountLevel)} />}
        {data.peakRank && (
          <StatChip label="Recorde de elo" value={`${data.peakRank.tierLabel} (${formatSeasonShort(data.peakRank.seasonShort)})`} />
        )}
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', color: 'var(--acc, #EF4958)' }}>
            {data.calloutIndex.value}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '.06em' }}>ÍNDICE CALLOUT</div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: -10, lineHeight: 1.5 }}>
        Índice callout: nota própria de 0 a 100 combinando taxa de vitória, KDA, ACS e delta de dano do ato — não é
        comparável a scores de outras plataformas.
      </div>

      <div className="grid-responsive-4">
        {kpiCards.map((k) => (
          <div key={k.label} style={{ ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>{k.label}</span>
            <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 28, letterSpacing: '-.02em' }}>{k.value}</span>
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
              <span style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--text-dim)' }}>{k.explain}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-responsive-3">
        <RankingBlock
          title="Agentes mais jogados"
          sub="Winrate · partidas · KDA no ato"
          rows={data.topAgents.slice(0, 8).map((a) => ({
            key: a.agent,
            name: a.agent,
            value: `${a.winratePercent}%`,
            caption: `${plural(a.matches, 'partida')} · KD ${fmtNum(a.kda, 2)}${a.bestMap ? ` · melhor em ${a.bestMap.map}` : ''}`,
            dot: a.color,
          }))}
        />
        <RateBlock
          title="Mapas"
          sub="Winrate por mapa no ato"
          rows={data.topMaps.map((m) => ({ key: m.map, name: m.map, wins: m.wins, total: m.total }))}
          colorFor={rateBarColor}
        />
        <RateBlock
          title="Funções"
          sub="Winrate por função no ato"
          rows={data.roles.map((r) => ({ key: r.role, name: r.role, wins: r.wins, total: r.matches }))}
          colorFor={rateBarColor}
        />
      </div>

      <div className="grid-responsive-2">
        <AccuracyBar accuracy={data.accuracy} />
        <RankingBlock
          title="Armas mais usadas"
          sub="Abates por arma no ato"
          rows={data.topWeapons.map((w) => ({ key: w.weapon, name: w.weapon, value: plural(w.kills, 'abate') }))}
        />
      </div>
    </div>
  );
}
