import { LegalPageShell } from '../components/LegalPageShell';
import { PrivacidadeContent } from '../components/LegalContent';

export function Privacidade() {
  return (
    <LegalPageShell title="Política de Privacidade" updatedAtLabel="03/09/2026 (rascunho)">
      <PrivacidadeContent />
    </LegalPageShell>
  );
}
