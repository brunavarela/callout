import { Modal, ModalHeader } from './Modal';
import { TermosContent, PrivacidadeContent } from './LegalContent';

// Aberto a partir do checkbox de aceite no cadastro (ver Cadastro.tsx) —
// mesmo texto de /termos e /privacidade, sem sair da tela de cadastro.
export function LegalModal({ doc, onClose }: { doc: 'termos' | 'privacidade'; onClose: () => void }) {
  return (
    <Modal onClose={onClose} width={620} closeOnBackdrop={false}>
      <ModalHeader title={doc === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'} onClose={onClose} />
      <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 20 }}>Última atualização: 03/09/2026 (rascunho)</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {doc === 'termos' ? <TermosContent /> : <PrivacidadeContent />}
      </div>
    </Modal>
  );
}
