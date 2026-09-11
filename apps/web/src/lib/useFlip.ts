import { useLayoutEffect, useRef } from 'react';

// FLIP (First/Last/Invert/Play) genérico — anima um grupo de elementos que
// trocam de posição/tamanho num reflow de CSS Grid/Flexbox instantâneo
// (ex.: grid-template-areas mudando), sem precisar trocar o layout em si
// por JS. Cada elemento é medido antes e depois da troca de `trigger`;
// a diferença de posição/tamanho é aplicada de volta como estado inicial
// (via transform + width/height explícitos) e removida com transition no
// frame seguinte, criando o efeito de "deslizar" pro lugar novo.
export function useFlip(trigger: unknown) {
  const rects = useRef<Map<string, DOMRect>>(new Map());
  const els = useRef<Map<string, HTMLElement>>(new Map());

  useLayoutEffect(() => {
    const prev = rects.current;
    const next = new Map<string, DOMRect>();

    els.current.forEach((el, key) => {
      const rect = el.getBoundingClientRect();
      next.set(key, rect);
      const before = prev.get(key);
      if (!before) return;

      const dx = before.left - rect.left;
      const dy = before.top - rect.top;
      const sameSize = Math.abs(before.width - rect.width) < 0.5 && Math.abs(before.height - rect.height) < 0.5;
      if (dx === 0 && dy === 0 && sameSize) return;

      el.style.transition = 'none';
      el.style.width = `${before.width}px`;
      el.style.height = `${before.height}px`;
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      // força o reflow antes de tirar o "none", senão o navegador
      // colapsa os dois estados numa transição só (sem animação).
      el.getBoundingClientRect();

      requestAnimationFrame(() => {
        el.style.transition = 'transform .35s ease, width .35s ease, height .35s ease';
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
        el.style.transform = 'translate(0, 0)';
        const clear = () => {
          el.style.transition = '';
          el.style.width = '';
          el.style.height = '';
          el.style.transform = '';
          el.removeEventListener('transitionend', clear);
        };
        el.addEventListener('transitionend', clear);
      });
    });

    rects.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (key: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(key, el);
    else els.current.delete(key);
  };
}
