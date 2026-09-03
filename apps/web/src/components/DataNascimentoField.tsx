import { useEffect, useState } from 'react';
import { Select } from './Select';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseValue(value: string): { dia: number | null; mes: number | null; ano: number | null } {
  if (!value) return { dia: null, mes: null, ano: null };
  const [anoStr, mesStr, diaStr] = value.split('-');
  return {
    ano: anoStr ? Number(anoStr) : null,
    mes: mesStr ? Number(mesStr) : null,
    dia: diaStr ? Number(diaStr) : null,
  };
}

// Substitui <input type="date"> — o popup nativo do calendário não segue o
// tema do app (sempre desenhado pelo SO/navegador, ver comentário de
// .select-trigger no index.css) e não dava pra estilizar. Três <Select>
// (dia/mês/ano) resolvem isso reaproveitando o componente que já existe.
//
// Guarda dia/mês/ano em estado PRÓPRIO (não só derivado de `value`) — se
// dependesse só de `value`, cada seleção parcial (só o dia, por exemplo)
// virava `onChange('')` porque a data ainda não tá completa, e a próxima
// renderização perdia a escolha que a pessoa acabou de fazer. Só quando os
// três já estão preenchidos é que `onChange` sobe o ISO completo pro pai.
export function DataNascimentoField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [{ dia, mes, ano }, setParts] = useState(() => parseValue(value));

  // Sincroniza de volta só quando o pai limpa o campo por fora (reset de
  // formulário) — não a cada `value`, pra não sobrescrever seleção parcial
  // com o '' que a gente mesmo manda enquanto a data ainda tá incompleta.
  useEffect(() => {
    if (!value) setParts({ dia: null, mes: null, ano: null });
  }, [value]);

  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 100 }, (_, i) => anoAtual - i);
  const maxDia = ano && mes ? daysInMonth(ano, mes) : 31;
  const dias = Array.from({ length: maxDia }, (_, i) => i + 1);

  function update(nextDia: number | null, nextMes: number | null, nextAno: number | null) {
    setParts({ dia: nextDia, mes: nextMes, ano: nextAno });
    if (nextDia && nextMes && nextAno) {
      const diaClamped = Math.min(nextDia, daysInMonth(nextAno, nextMes));
      onChange(`${nextAno}-${String(nextMes).padStart(2, '0')}-${String(diaClamped).padStart(2, '0')}`);
    } else {
      onChange('');
    }
  }

  const compactStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 14,
    ...(disabled ? { opacity: 0.6, pointerEvents: 'none' } : null),
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, maxWidth: '50%' }}>
      <Select
        value={dia ? String(dia) : ''}
        onChange={(v) => update(Number(v), mes, ano)}
        options={[{ value: '', label: 'Dia' }, ...dias.map((d) => ({ value: String(d), label: String(d) }))]}
        style={compactStyle}
      />
      <Select
        value={mes ? String(mes) : ''}
        onChange={(v) => update(dia, Number(v), ano)}
        options={[{ value: '', label: 'Mês' }, ...MESES.map((m, i) => ({ value: String(i + 1), label: m }))]}
        style={compactStyle}
      />
      <Select
        value={ano ? String(ano) : ''}
        onChange={(v) => update(dia, mes, Number(v))}
        options={[{ value: '', label: 'Ano' }, ...anos.map((a) => ({ value: String(a), label: String(a) }))]}
        style={compactStyle}
      />
    </div>
  );
}
