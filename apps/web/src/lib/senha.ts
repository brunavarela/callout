// Mesmas regras validadas no backend (apps/api/src/routes/auth.ts,
// SENHA_REGEX) — duplicado de propósito porque um roda no navegador (feedback
// ao digitar) e o outro no servidor (fonte de verdade); mudar uma exige
// mudar a outra.
export const SENHA_REQUISITOS = [
  { key: 'len', label: 'Pelo menos 8 caracteres', test: (s: string) => s.length >= 8 },
  { key: 'upper', label: 'Uma letra maiúscula', test: (s: string) => /[A-Z]/.test(s) },
  { key: 'number', label: 'Um número', test: (s: string) => /[0-9]/.test(s) },
  { key: 'special', label: 'Um caractere especial', test: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const;

export function senhaValida(senha: string): boolean {
  return SENHA_REQUISITOS.every((r) => r.test(senha));
}
