import { LegalPageShell } from '../components/LegalPageShell';
import { TermosContent } from '../components/LegalContent';

export function Termos() {
  return (
    <LegalPageShell title="Termos de Uso" updatedAtLabel="21/09/2026">
      <TermosContent />
    </LegalPageShell>
  );
}
