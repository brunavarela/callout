import { useEffect, useRef, useState } from 'react';
import { Ban } from 'lucide-react';
import { MAP_BACKGROUNDS, type MapBackground, type ThemePreferences } from '@callout/shared';
import { THEME_PALETTE, useTheme } from '../lib/theme';
import { Modal, ModalHeader } from './Modal';

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={color}
      style={{
        width: 22,
        height: 22,
        flex: 'none',
        borderRadius: '50%',
        background: color,
        border: active ? '2px solid var(--text)' : '2px solid transparent',
        outline: active ? 'none' : '1px solid var(--surface-border)',
        cursor: 'pointer',
      }}
    />
  );
}

// Nome pra exibir no título de cada miniatura de mapa -- MAP_BACKGROUNDS
// (@callout/shared) é a key do arquivo (ver apps/web/public/img/maps), em
// minúsculo; aqui só pra ficar legível no hover.
const MAP_LABELS: Record<MapBackground, string> = {
  abyss: 'Abyss',
  ascent: 'Ascent',
  bind: 'Bind',
  breeze: 'Breeze',
  corrode: 'Corrode',
  fracture: 'Fracture',
  haven: 'Haven',
  icebox: 'Icebox',
  lotus: 'Lotus',
  pearl: 'Pearl',
  split: 'Split',
  summit: 'Summit',
  sunset: 'Sunset',
};

function MapThumb({ map, active, onClick }: { map: MapBackground | null; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={map ? MAP_LABELS[map] : 'Nenhum'}
      style={{
        width: 52,
        height: 52,
        flex: 'none',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        border: active ? '2px solid var(--acc, #EF4958)' : '2px solid transparent',
        outline: active ? 'none' : '1px solid var(--surface-border)',
        background: map ? `url(/img/maps/${map}.png) center/cover` : 'var(--input-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!map && <Ban size={18} strokeWidth={1.75} color="var(--text-faint)" />}
    </button>
  );
}

// SAVE_DELAY_MS: o slider de glow precisa parecer instantâneo ao arrastar —
// antes, cada tick chamava a API e esperava a resposta antes de atualizar a
// tela, e um <input type="range"> dispara dezenas de eventos por segundo
// enquanto arrasta, então cada um deles esperando rede deixava tudo
// "travado". Agora o valor local atualiza na hora (sem esperar nada) e a
// gravação de verdade é adiada — só dispara ~180ms depois do último ajuste,
// então arrastar de ponta a ponta faz UMA chamada no final, não uma por tick.
const SAVE_DELAY_MS = 180;

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const [local, setLocal] = useState<ThemePreferences>(theme);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setLocal(theme), [theme]);

  function apply(next: ThemePreferences, immediate = false) {
    setLocal(next);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (immediate) {
      setTheme(next);
    } else {
      saveTimeout.current = setTimeout(() => setTheme(next), SAVE_DELAY_MS);
    }
  }

  function handleClose() {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      setTheme(local);
    }
    onClose();
  }

  return (
    <Modal onClose={handleClose} width={360}>
      <ModalHeader title="Tema" onClose={handleClose} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>COR PRINCIPAL</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, rowGap: 10 }}>
            {THEME_PALETTE.map((c) => (
              <Swatch key={c} color={c} active={local.accentColor === c} onClick={() => apply({ ...local, accentColor: c }, true)} />
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>COR NEGATIVA</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, rowGap: 10 }}>
            {THEME_PALETTE.map((c) => (
              <Swatch key={c} color={c} active={local.negativeColor === c} onClick={() => apply({ ...local, negativeColor: c }, true)} />
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>
            <span>GLOW</span>
            <span style={{ marginLeft: 'auto' }}>{local.glow}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={local.glow}
            onChange={(e) => apply({ ...local, glow: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--text-dim)', marginBottom: 8 }}>FUNDO</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <MapThumb map={null} active={local.mapBackground === null} onClick={() => apply({ ...local, mapBackground: null }, true)} />
            {MAP_BACKGROUNDS.map((m) => (
              <MapThumb key={m} map={m} active={local.mapBackground === m} onClick={() => apply({ ...local, mapBackground: m }, true)} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8, lineHeight: 1.4 }}>
            Arte do mapa escolhido, escurecida, como fundo em todas as telas.
          </div>
        </div>
      </div>
    </Modal>
  );
}
