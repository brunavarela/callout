import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import type { MatchBadge, SeasonMatchesPage, SeasonMatchSummary } from '@callout/shared';
import { LoadingFill } from './Spinner';
import { cardStyle, fmtNum, fmtDelta, plural } from './statsPrimitives';
import { PageControls, MODO_LABELS } from './SeasonFilters';

const WIN = 'var(--pos, #18AAB7)';
const LOSS = 'var(--neg, #EF4958)';
const DRAW = 'var(--text-muted, #9A9DA1)';
const GOLD = '#E8B339';

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

// Agrupa badges repetidos (3 clutches 1v2 na mesma partida, por exemplo)
// numa contagem só — "3x 1v2 clutch" em vez de "1v2 clutch" três vezes.
function groupBadges(badges: MatchBadge[]): Array<{ badge: MatchBadge; count: number }> {
  const byKey = new Map<string, { badge: MatchBadge; count: number }>();
  for (const b of badges) {
    const key = `${b.kind}:${b.size}`;
    const entry = byKey.get(key);
    if (entry) entry.count++;
    else byKey.set(key, { badge: b, count: 1 });
  }
  return [...byKey.values()];
}

// Agrupa as partidas (de uma página, já com no máximo 10) por dia
// calendário — não pelo texto relativo de playedAtLabel ("hoje"/"ontem"/
// "seg"), que não dá pra usar como chave de agrupamento.
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

function StatCol({ label, value, color, bold, width = 46 }: { label: string; value: string; color?: string; bold?: boolean; width?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width, flex: 'none' }} title={label}>
      <span style={{ fontSize: 10, letterSpacing: '.04em', color: 'var(--text-faint)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color: color ?? 'var(--text-2)', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// Uma linha de partida do ato — ícone de agente preenchendo o "quadrado"
// (mapa como fallback), badges de clutch/multi-kill, fundo tingido na cor
// do resultado (mais vivo que só a borda esquerda) e o placar em destaque.
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
        background: `color-mix(in srgb, ${resultColor} 14%, var(--surface-2, rgba(255,255,255,.02)))`,
      }}
    >
      {agentIcon || mapIcon ? (
        <img src={agentIcon ?? mapIcon!} alt="" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'contain', background: 'var(--track)', flex: 'none' }} />
      ) : (
        <span style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--track)', flex: 'none' }} />
      )}

      <div style={{ flex: '0 1 auto', minWidth: 0, maxWidth: 230 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.map} <span style={{ color: 'var(--text-faint)' }}>· {MODO_LABELS[m.modo] ?? m.modo}</span>
          </span>
          {m.rankIconUrl && <img src={m.rankIconUrl} alt="" title="Elo na hora dessa partida" style={{ width: 16, height: 16, objectFit: 'contain', flex: 'none' }} />}
          {m.mvp ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '.02em',
                borderRadius: 5,
                padding: '2px 7px 2px 5px',
                whiteSpace: 'nowrap',
                color: '#141415',
                background: GOLD,
                boxShadow: `0 0 0 1px color-mix(in srgb, ${GOLD} 55%, transparent), 0 1px 4px color-mix(in srgb, ${GOLD} 45%, transparent)`,
              }}
            >
              <Crown size={11} strokeWidth={2.5} fill="#141415" />
              MVP
            </span>
          ) : (
            m.position !== null && (
              <span
                title="Posição no próprio time por ACS"
                style={{ fontSize: 9.5, fontWeight: 700, borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap', color: 'var(--text-3)', background: 'var(--track)' }}
              >
                {m.position}º
              </span>
            )
          )}
          {groupBadges(m.badges).map(({ badge, count }, i) => (
            <span key={i} style={{ fontSize: 8.5, fontWeight: 700, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', color: badgeColor(badge), background: `color-mix(in srgb, ${badgeColor(badge)} 18%, transparent)` }}>
              {count > 1 ? `${count}x ` : ''}
              {badgeLabel(badge)}
            </span>
          ))}
        </div>
        {!compact && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>{m.playedAtLabel}</div>}
      </div>

      <StatCol label="PLACAR" value={m.score} bold />

      {!compact && (
        <>
          <StatCol label="K/D" value={fmtNum(m.kdaRatio, 1)} />
          <StatCol label="K/D/A" value={m.kda} width={62} />
          <StatCol label="DDΔ" value={fmtDelta(m.ddPerRound, 0)} color={m.ddPerRound >= 0 ? WIN : LOSS} />
          <StatCol label="HS%" value={`${fmtNum(m.hsPercent, 0)}%`} />
          <StatCol label="ACS" value={String(m.acs)} bold />
        </>
      )}
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', width: 36, flex: 'none', color: m.rr === null ? 'var(--text-faint)' : m.rr >= 0 ? WIN : LOSS }}>
        {m.rr === null ? '—' : fmtRr(m.rr)}
      </span>
    </div>
  );
}

// Card completo de lista de partidas — cabeçalho (título + toggle
// Detalhado/Compacto), partidas agrupadas por dia, paginação de 12 em 12.
// Usado tanto na Visão do ato (Dashboard) quanto na página de Partidas
// (histórico individual completo) — mesmo componente, dados diferentes.
export function SeasonMatchesList({
  matchesPage,
  loading,
  error,
  mapIcons,
  agentIcons,
  setPage,
  title = 'Partidas',
}: {
  matchesPage: SeasonMatchesPage | null;
  loading: boolean;
  error: string | null;
  mapIcons: Record<string, string>;
  agentIcons: Record<string, string>;
  setPage: (page: number) => void;
  title?: string;
}) {
  const [compact, setCompact] = useState(false);

  if (loading) return <LoadingFill />;
  if (error) return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>{error}</div>;
  if (!matchesPage || matchesPage.matches.length === 0) {
    return <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>Nenhuma partida encontrada com esse filtro.</div>;
  }

  const dayGroups = groupByDay(matchesPage.matches);

  return (
    <div style={{ ...cardStyle, padding: '16px 18px 8px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{plural(matchesPage.total, 'partida')} no ato</div>
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
                  <SeasonMatchRow key={m.id} m={m} agentIcon={agentIcons[m.agent] ?? null} mapIcon={mapIcons[m.map] ?? null} compact={compact} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PageControls page={matchesPage.page} pageSize={matchesPage.pageSize} total={matchesPage.total} setPage={setPage} />
    </div>
  );
}
