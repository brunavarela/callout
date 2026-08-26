import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

// Substitui <select> nativo — ver comentário de .select-trigger no index.css
// pro motivo. Mesma assinatura value/onChange(string) de um select comum,
// então troca direto sem mexer no resto da tela que usa.
export function Select({
  value,
  onChange,
  options,
  className,
  style,
  title,
  align = 'left',
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // width/flex/margin vão pro wrapper (é ele quem participa do layout ao
  // redor — grid, flex, espaçamento com os vizinhos —, igual um <select>
  // fazia); o resto (padding, fonte, altura…) é visual e fica no botão, que
  // sempre enche 100% do wrapper.
  const { width, flex, margin, marginTop, marginRight, marginBottom, marginLeft, ...triggerStyle } = style ?? {};
  const wrapperStyle: React.CSSProperties = { position: 'relative', display: 'inline-block', width: width ?? '100%', flex, margin, marginTop, marginRight, marginBottom, marginLeft };

  return (
    <div ref={rootRef} style={wrapperStyle}>
      <button
        type="button"
        title={title}
        className={`select-trigger input-field ${className ?? ''}`}
        onClick={() => setOpen((v) => !v)}
        data-open={open}
        style={{ width: '100%', ...triggerStyle }}
      >
        <span className="select-trigger-label">{selected?.label ?? ''}</span>
        <ChevronDown size={14} strokeWidth={2} className="select-chevron" />
      </button>
      {open && (
        <div className={`select-panel${align === 'right' ? ' align-right' : ''}`} role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`select-option${o.value === value ? ' is-selected' : ''}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
