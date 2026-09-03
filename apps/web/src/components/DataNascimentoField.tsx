import { Select } from './Select';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Substitui <input type="date"> — o popup nativo do calendário não segue o
// tema do app (sempre desenhado pelo SO/navegador, ver comentário de
// .select-trigger no index.css) e não dava pra estilizar. Três <Select>
// (dia/mês/ano) resolvem isso reaproveitando o componente que já existe.
export function DataNascimentoField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [anoStr, mesStr, diaStr] = value ? value.split('-') : ['', '', ''];
  const ano = anoStr ? Number(anoStr) : null;
  const mes = mesStr ? Number(mesStr) : null;
  const dia = diaStr ? Number(diaStr) : null;

  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 100 }, (_, i) => anoAtual - i);
  const maxDia = ano && mes ? daysInMonth(ano, mes) : 31;
  const dias = Array.from({ length: maxDia }, (_, i) => i + 1);

  function commit(nextDia: number | null, nextMes: number | null, nextAno: number | null) {
    if (nextDia && nextMes && nextAno) {
      const diaClamped = Math.min(nextDia, daysInMonth(nextAno, nextMes));
      onChange(`${nextAno}-${String(nextMes).padStart(2, '0')}-${String(diaClamped).padStart(2, '0')}`);
    } else {
      onChange('');
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.2fr', gap: 8 }}>
      <Select
        value={dia ? String(dia) : ''}
        onChange={(v) => commit(Number(v), mes, ano)}
        options={[{ value: '', label: 'Dia' }, ...dias.map((d) => ({ value: String(d), label: String(d) }))]}
        style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
      />
      <Select
        value={mes ? String(mes) : ''}
        onChange={(v) => commit(dia, Number(v), ano)}
        options={[{ value: '', label: 'Mês' }, ...MESES.map((m, i) => ({ value: String(i + 1), label: m }))]}
        style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
      />
      <Select
        value={ano ? String(ano) : ''}
        onChange={(v) => commit(dia, mes, Number(v))}
        options={[{ value: '', label: 'Ano' }, ...anos.map((a) => ({ value: String(a), label: String(a) }))]}
        style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
      />
    </div>
  );
}
