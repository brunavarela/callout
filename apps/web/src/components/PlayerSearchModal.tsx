import { useState } from 'react';
import { Modal, ModalHeader } from './Modal';

// Modal "Encontre jogadores" -- busca só RiotID (POST /dashboard/buscar via
// searchRiotId, ver appData.ts). Viveu no header global até 21/09/2026;
// mudou pro headerpage do Painel/Partidas (RiotIdSearchFilter em
// SeasonFilters.tsx), no lugar do antigo botão/input de busca -- só um
// jeito de abrir a mesma busca, não a busca em si.
export function PlayerSearchModal({
  onClose,
  onSearch,
  loading,
  error,
}: {
  onClose: () => void;
  onSearch: (riotId: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [value, setValue] = useState('');

  return (
    <Modal onClose={onClose} width={380}>
      <ModalHeader title="Encontre jogadores" onClose={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (trimmed) onSearch(trimmed);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <input
          className="input-field"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="nome#BR1"
          disabled={loading}
        />
        {error && <div style={{ fontSize: 12.5, color: 'var(--acc, #EF4958)' }}>{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading || !value.trim()} style={{ justifyContent: 'center' }}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
    </Modal>
  );
}
