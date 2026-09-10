import { useNavigate } from 'react-router-dom';
import type { MatchBadge, SeasonMatchSummary, SeasonOverview } from '@callout/shared';
import { LoadingFill } from './Spinner';
import { Select } from './Select';
import { cardStyle, fmtNum, fmtDelta, plural, rateBarColor, RateBlock, RankingBlock } from './statsPrimitives';

const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--neg, #EF4958)';
const DRAW = 'var(--text-muted, #9A9DA1)';

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

function fmtRr(n: number): string {
  const abs = Math.abs(n);
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return String(abs);
}

function StatChip({ label, value, iconUrl }: { label: string; value: string; iconUrl?: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {iconUrl && <img src={iconUrl} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flex: 'none' }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)' }}>{label.toUpperCase()}</span>
        <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 15 }}>{value}</span>
      </div>
    </div>
  );
}

// Mini ataque/defesa — ocupa o lugar que antes era o número grande do
// Índice callout na faixa de topo (a Bruna pediu pra tirar o índice
// callout dali; "vamos ver o encaixe dele depois" — por ora ele mora como
// mais um card no grid de KPIs, mais abaixo).
function AttackDefenseMini({ sides }: { sides: SeasonOverview['attackDefense'] }) {
  const rows: Array<{ label: string; winratePercent: number }> = [
    { label: 'Ataque', winratePercent: sides.attack.winratePercent },
    { label: 'Defesa', winratePercent: sides.defense.winratePercent },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
      <span style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--text-dim)' }}>ATAQUE × DEFESA</span>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', width: 46, flex: 'none' }}>{r.label}</span>
          <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--track)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${r.winratePercent}%`, borderRadius: 4, background: r.winratePercent >= 50 ? WIN : 'color-mix(in srgb, var(--neg, #EF4958) 42%, var(--track))' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, width: 32, textAlign: 'right', flex: 'none' }}>{r.winratePercent}%</span>
        </div>
      ))}
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

function badgeLabel(b: MatchBadge): string {
  return b.kind === 'clutch' ? `1v${b.size} clutch` : `${b.size}k`;
}

// Uma linha de partida do ato — mesmo espírito visual do MatchRow.tsx (V/D
// à esquerda, resultado + placar + RR), mas com ícone de agente (ou de
// mapa, na ausência do de agente) preenchendo o "quadrado" da linha, os
// badges de clutch/multi-kill dessa partida, e o Índice callout calculado
// só pra essa partida no lugar do "TRS" do concorrente.
function SeasonMatchRow({ m, agentIcon, mapIcon }: { m: SeasonMatchSummary; agentIcon: string | null; mapIcon: string | null }) {
  const navigate = useNavigate();
  return (
    <div
      className="list-row"
      onClick={() => navigate(`/partida/${m.id}`)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 6px', margin: '0 -6px', borderRadius: 8, cursor: 'pointer', borderTop: '1px solid var(--divider)' }}
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          borderRadius: 4,
          textAlign: 'center',
          width: 22,
          flex: 'none',
          padding: '3px 0',
          color: m.result === 'V' ? WIN : m.result === 'D' ? LOSS : DRAW,
          background:
            m.result === 'V'
              ? 'color-mix(in srgb, var(--pos, #18AAB7) 16%, transparent)'
              : m.result === 'D'
                ? 'color-mix(in srgb, var(--neg, #EF4958) 14%, transparent)'
                : 'color-mix(in srgb, var(--text-muted, #9A9DA1) 16%, transparent)',
        }}
      >
        {m.result}
      </span>

      {agentIcon || mapIcon ? (
        <img src={agentIcon ?? mapIcon!} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'contain', background: 'var(--track)', flex: 'none' }} />
      ) : (
        <span style={{ width: 34, height: 34, borderRadius: 7, background: 'var(--track)', flex: 'none' }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.map} <span style={{ color: 'var(--text-faint)' }}>· {m.agent}</span>
          </span>
          {m.badges.map((b, i) => (
            <span
              key={i}
              style={{ fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', color: b.kind === 'clutch' ? '#A78BFA' : '#E8B339', background: `color-mix(in srgb, ${b.kind === 'clutch' ? '#A78BFA' : '#E8B339'} 18%, transparent)` }}
            >
              {badgeLabel(b)}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>
          KDA {m.kda} · ACS {m.acs} · HS {m.hsPercent}% · {m.playedAtLabel}
        </div>
      </div>

      <span style={{ fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap', flex: 'none' }}>{m.score}</span>

      <span style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'right', width: 34, flex: 'none', color: m.rr === null ? 'var(--text-faint)' : m.rr >= 0 ? WIN : LOSS }}>
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

export function SeasonOverviewSection({
  data,
  loading,
  error,
  selectedSeasonId,
  setSelectedSeasonId,
}: {
  data: SeasonOverview | null;
  loading: boolean;
  error: string | null;
  selectedSeasonId: string | null;
  setSelectedSeasonId: (seasonId: string | null) => void;
}) {
  if (loading) return <LoadingFill />;
  if (error) return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>{error}</div>;
  if (!data) {
    return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>Sem dados de ato ainda.</div>;
  }

  const seasonOptions = data.availableSeasons.map((s) => ({ value: s.seasonId, label: formatSeasonShort(s.seasonShort) }));

  if (data.matchesCount === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {seasonOptions.length > 1 && (
          <Select
            value={data.seasonId ?? selectedSeasonId ?? seasonOptions[0]!.value}
            onChange={setSelectedSeasonId}
            options={seasonOptions}
            title="Escolher o ato"
            style={{ width: 220, height: 36, padding: '0 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
          />
        )}
        <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
          {data.seasonShort ? `Nenhuma partida competitiva ainda em ${formatSeasonShort(data.seasonShort)}.` : 'Sem dados desse ato ainda.'}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Índice callout', value: String(data.calloutIndex.value), explain: 'Nota própria de 0 a 100 combinando taxa de vitória, KDA, ACS e delta de dano — não é comparável a scores de outras plataformas.' },
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

  const recentMatches = data.recentMatches;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...cardStyle, padding: '18px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
        <div>
          {seasonOptions.length > 1 ? (
            <Select
              value={data.seasonId ?? selectedSeasonId ?? seasonOptions[0]!.value}
              onChange={setSelectedSeasonId}
              options={seasonOptions}
              title="Escolher o ato"
              style={{ width: 210, height: 32, padding: '0 10px', borderRadius: 8, fontSize: 15, fontWeight: 700 }}
            />
          ) : (
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 19 }}>
              {data.seasonShort ? formatSeasonShort(data.seasonShort) : 'Ato atual'}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
            {plural(data.matchesCount, 'partida')} · {formatPlaytime(data.playtimeMs)} jogadas
          </div>
        </div>
        {data.accountLevel !== null && <StatChip label="Nível" value={String(data.accountLevel)} />}
        {data.currentRank && <StatChip label="Elo atual" value={`${data.currentRank.tierLabel} · ${data.currentRank.rr} RR`} iconUrl={data.currentRank.iconUrl} />}
        {data.peakRank && <StatChip label="Recorde de elo" value={`${data.peakRank.tierLabel} (${formatSeasonShort(data.peakRank.seasonShort)})`} />}
        <div style={{ marginLeft: 'auto' }}>
          <AttackDefenseMini sides={data.attackDefense} />
        </div>
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

      <div className="grid-responsive-season">
        <div style={{ ...cardStyle, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Últimas {plural(recentMatches.length, 'partida')} do ato</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
            Da mais recente para a mais antiga · número em destaque é o Índice callout dessa partida
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentMatches.map((m) => (
              <SeasonMatchRow key={m.id} m={m} agentIcon={data.agentIcons[m.agent] ?? null} mapIcon={data.mapIcons[m.map] ?? null} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RankingBlock
            title="Agentes mais jogados"
            sub="Winrate · partidas · KDA no ato"
            rows={data.topAgents.slice(0, 6).map((a) => ({
              key: a.agent,
              name: a.agent,
              value: `${a.winratePercent}%`,
              caption: `${plural(a.matches, 'partida')} · KD ${fmtNum(a.kda, 2)}${a.bestMap ? ` · melhor em ${a.bestMap.map}` : ''}`,
              icon: data.agentIcons[a.agent],
              dot: a.color,
            }))}
          />
          <RateBlock
            title="Mapas"
            sub="Winrate por mapa no ato"
            rows={data.topMaps.map((m) => ({ key: m.map, name: m.map, wins: m.wins, total: m.total, icon: data.mapIcons[m.map] }))}
            colorFor={rateBarColor}
          />
          <RateBlock
            title="Funções"
            sub="Winrate por função no ato"
            rows={data.roles.map((r) => ({ key: r.role, name: r.role, wins: r.wins, total: r.matches }))}
            colorFor={rateBarColor}
          />
        </div>
      </div>

      {/* Cards adicionais — sobram depois da lista de partidas, "encaixados"
          lado a lado em vez de ficarem perdidos no fim da página. */}
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
