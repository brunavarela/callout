import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchBadge, SeasonMatchSummary, SeasonOverview } from '@callout/shared';
import { LoadingFill } from './Spinner';
import { cardStyle, fmtNum, fmtDelta, plural, rateBarColor, RateBlock, RankingBlock } from './statsPrimitives';

const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--neg, #EF4958)';
const DRAW = 'var(--text-muted, #9A9DA1)';
const UNDER_50 = 'color-mix(in srgb, var(--neg, #EF4958) 42%, var(--track))';

// A HenrikDev devolve o "short" do ato em código interno ("e11a5" =
// episódio 11, ato 5), não no formato bonito que aparece no cliente do
// jogo — só deixa mais legível; se um dia o formato mudar, cai de volta
// pro valor bruto sem quebrar nada.
export function formatSeasonShort(raw: string): string {
  const match = /^e(\d+)a(\d+)$/i.exec(raw);
  if (!match) return raw;
  return `Episódio ${match[1]} · Ato ${match[2]}`;
}

export function formatPlaytime(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)}min`;
  return `${fmtNum(hours, hours < 10 ? 1 : 0)}h`;
}

function fmtRr(n: number): string {
  const abs = Math.abs(n);
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return String(abs);
}

function badgeLabel(b: MatchBadge): string {
  return b.kind === 'clutch' ? `1v${b.size} clutch` : `${b.size}k`;
}

function badgeColor(b: MatchBadge): string {
  return b.kind === 'clutch' ? '#A78BFA' : '#E8B339';
}

// Agrupa as partidas por dia calendário (não pelo texto relativo de
// playedAtLabel, que é "hoje"/"ontem"/"seg" — não dá pra usar como chave).
// A lista já vem ordenada da mais recente pra mais antiga; preserva isso.
function groupByDay(matches: SeasonMatchSummary[]): Array<{ key: string; label: string; matches: SeasonMatchSummary[] }> {
  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(today);

  const groups: Array<{ key: string; label: string; matches: SeasonMatchSummary[] }> = [];
  for (const m of matches) {
    const d = new Date(m.playedAtIso);
    const key = d.toDateString();
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const diffDays = Math.round((todayStart - startOfDay(d)) / 86_400_000);
      const label = diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Ontem' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
      group = { key, label, matches: [] };
      groups.push(group);
    }
    group.matches.push(m);
  }
  return groups;
}

function parseKda(kda: string): [number, number, number] {
  const [k, d, a] = kda.split('/').map(Number);
  return [k ?? 0, d ?? 0, a ?? 0];
}

// Linha de resumo do dia — contagem V/D e a média das mesmas métricas que
// cada linha de partida mostra, pra dar o "placar do dia" antes de listar
// as partidas dele.
function DayHeaderRow({ label, matches }: { label: string; matches: SeasonMatchSummary[] }) {
  const wins = matches.filter((m) => m.result === 'V').length;
  const losses = matches.filter((m) => m.result === 'D').length;
  let k = 0,
    d = 0,
    a = 0;
  for (const m of matches) {
    const [mk, md, ma] = parseKda(m.kda);
    k += mk;
    d += md;
    a += ma;
  }
  const avgAcs = Math.round(matches.reduce((s, m) => s + m.acs, 0) / matches.length);
  const avgHs = matches.reduce((s, m) => s + m.hsPercent, 0) / matches.length;
  const avgDd = matches.reduce((s, m) => s + m.ddPerRound, 0) / matches.length;
  const kd = d > 0 ? fmtNum(k / d, 1) : String(k);

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '14px 6px 6px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 13.5 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          {plural(matches.length, 'partida')} · {wins}V·{losses}D
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
        <span>
          K/D <b style={{ color: 'var(--text-3)', fontWeight: 600 }}>{kd}</b>
        </span>
        <span style={{ color: 'var(--text-2)' }}>
          {k}/{d}/{a}
        </span>
        <span>
          DDΔ <b style={{ color: avgDd >= 0 ? WIN : LOSS, fontWeight: 600 }}>{fmtDelta(avgDd, 0)}</b>
        </span>
        <span>
          HS <b style={{ color: 'var(--text-3)', fontWeight: 600 }}>{fmtNum(avgHs, 0)}</b>
        </span>
        <span>
          ACS <b style={{ color: 'var(--text-3)', fontWeight: 600 }}>{avgAcs}</b>
        </span>
      </div>
    </div>
  );
}

// Uma linha de partida do ato — ícone de agente preenchendo o "quadrado"
// (mapa como fallback), badges de clutch/multi-kill, e o Índice callout
// dessa partida (calculado com a mesma fórmula do agregado, só que com o
// resultado 0/100 dessa partida) no lugar do "TRS" do concorrente.
function SeasonMatchRow({ m, agentIcon, mapIcon, compact }: { m: SeasonMatchSummary; agentIcon: string | null; mapIcon: string | null; compact: boolean }) {
  const navigate = useNavigate();
  const resultColor = m.result === 'V' ? WIN : m.result === 'D' ? LOSS : DRAW;

  return (
    <div
      className="list-row"
      onClick={() => navigate(`/partida/${m.id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 8px 8px 10px',
        margin: '2px 0',
        borderRadius: 8,
        cursor: 'pointer',
        borderLeft: `3px solid ${resultColor}`,
        background: 'var(--surface-2, rgba(255,255,255,.02))',
      }}
    >
      {agentIcon || mapIcon ? (
        <img src={agentIcon ?? mapIcon!} alt="" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'contain', background: 'var(--track)', flex: 'none' }} />
      ) : (
        <span style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--track)', flex: 'none' }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.map} <span style={{ color: 'var(--text-faint)' }}>· {m.agent}</span>
          </span>
          {m.badges.map((b, i) => (
            <span key={i} style={{ fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', color: badgeColor(b), background: `color-mix(in srgb, ${badgeColor(b)} 18%, transparent)` }}>
              {badgeLabel(b)}
            </span>
          ))}
        </div>
        {!compact && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>{m.playedAtLabel}</div>}
      </div>

      {!compact && (
        <>
          <StatCol label="K/D" value={fmtNum(m.kdaRatio, 1)} />
          <StatCol label="K/D/A" value={m.kda} width={62} />
          <StatCol label="DDΔ" value={fmtDelta(m.ddPerRound, 0)} color={m.ddPerRound >= 0 ? WIN : LOSS} />
          <StatCol label="HS%" value={`${fmtNum(m.hsPercent, 0)}%`} />
          <StatCol label="ACS" value={String(m.acs)} bold />
        </>
      )}

      <span style={{ fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap', flex: 'none', width: 42, textAlign: 'center' }}>{m.score}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'right', width: 32, flex: 'none', color: m.rr === null ? 'var(--text-faint)' : m.rr >= 0 ? WIN : LOSS }}>
        {m.rr === null ? '—' : fmtRr(m.rr)}
      </span>
      <span
        title="Índice callout dessa partida"
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          textAlign: 'center',
          width: 30,
          flex: 'none',
          padding: '3px 0',
          borderRadius: 6,
          color: 'var(--acc, #EF4958)',
          background: 'color-mix(in srgb, var(--acc, #EF4958) 12%, transparent)',
        }}
      >
        {m.calloutIndex}
      </span>
    </div>
  );
}

function StatCol({ label, value, color, bold, width = 40 }: { label: string; value: string; color?: string; bold?: boolean; width?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width, flex: 'none' }} title={label}>
      <span style={{ fontSize: 8.5, letterSpacing: '.04em', color: 'var(--text-faint)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: bold ? 700 : 500, color: color ?? 'var(--text-2)', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
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
}: {
  data: SeasonOverview | null;
  loading: boolean;
  error: string | null;
}) {
  const [compact, setCompact] = useState(false);

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

  const kpiCards = [
    { label: 'KDA médio', value: fmtNum(data.kda, 2), explain: 'Abates mais assistências divididos pelas mortes, no ato.' },
    { label: 'ACS médio', value: String(data.acs), explain: 'Pontuação de combate por round, considerando todo o ato.' },
    { label: 'ADR', value: String(data.adr), explain: 'Dano médio causado por round no ato.' },
    { label: 'Tiros na cabeça', value: `${fmtNum(data.hsPercent, 1)}%`, explain: 'Dos seus tiros que acertaram, quantos foram na cabeça.' },
    { label: 'Partidas ganhas', value: `${data.winratePercent}%`, explain: `${plural(data.wins, 'vitória')} em ${plural(data.matchesCount, 'partida')} no ato.` },
    {
      label: 'Índice callout',
      value: String(data.calloutIndex.value),
      explain: 'Nota própria de 0 a 100 combinando taxa de vitória, KDA, ACS e delta de dano — não é comparável a scores de outras plataformas.',
      highlight: true,
    },
  ];

  const dayGroups = groupByDay(data.recentMatches);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid-responsive-kpi6">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            style={{
              ...cardStyle,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              ...(k.highlight
                ? { background: 'color-mix(in srgb, var(--pos, #18AAB7) 12%, var(--surface))', border: '1px solid color-mix(in srgb, var(--pos, #18AAB7) 35%, var(--surface-border))' }
                : {}),
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: k.highlight ? WIN : 'var(--text-3)' }}>{k.label}</span>
            <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 28, letterSpacing: '-.02em', color: k.highlight ? WIN : 'var(--text)' }}>{k.value}</span>
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
              <span style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--text-dim)' }}>{k.explain}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-responsive-season">
        <div style={{ ...cardStyle, padding: '16px 18px 8px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Partidas</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Últimas {plural(data.recentMatches.length, 'partida')} do ato · número em destaque é o Índice callout</div>
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--input-bg)', border: '1px solid var(--surface-border)', borderRadius: 9, padding: 3 }}>
              {(['Detalhado', 'Compacto'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setCompact(opt === 'Compacto')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11.5,
                    whiteSpace: 'nowrap',
                    background: (opt === 'Compacto') === compact ? 'var(--acc, #EF4958)' : 'transparent',
                    color: (opt === 'Compacto') === compact ? 'var(--acc-text, #141415)' : 'var(--text-muted)',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="scroll-x-mobile">
            <div style={{ minWidth: compact ? undefined : 560 }}>
              {dayGroups.map((g) => (
                <div key={g.key}>
                  <DayHeaderRow label={g.label} matches={g.matches} />
                  <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 6 }}>
                    {g.matches.map((m) => (
                      <SeasonMatchRow key={m.id} m={m} agentIcon={data.agentIcons[m.agent] ?? null} mapIcon={data.mapIcons[m.map] ?? null} compact={compact} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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
