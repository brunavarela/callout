import { LegalPageShell } from '../components/LegalPageShell';
import { PrivacidadeContent } from '../components/LegalContent';

export function Privacidade() {
  return (
    <LegalPageShell title="Política de Privacidade" updatedAtLabel="21/09/2026">
      <PrivacidadeContent />
    </LegalPageShell>
  );
}
