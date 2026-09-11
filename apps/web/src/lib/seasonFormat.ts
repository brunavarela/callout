import { fmtNum } from '../components/statsPrimitives';

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
