import { LegalPageShell } from '../components/LegalPageShell';
import { TermosContent } from '../components/LegalContent';

export function Termos() {
  return (
    <LegalPageShell title="Termos de Uso" updatedAtLabel="03/09/2026 (rascunho)">
      <TermosContent />
    </LegalPageShell>
  );
}
