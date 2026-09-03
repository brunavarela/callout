export type OnboardingStep = "verificar-email" | "verificar-riot" | "equipe" | "completo";

// Ordem fixa do funil de cadastro (email+senha, desde 03/09/2026) — usado
// tanto no DTO da sessão (toSessionUser) quanto nos guards de rota do front,
// pra decidir pra onde mandar a pessoa a cada passo. `intuitos` é coletado
// junto com o resto do formulário de POST /auth/cadastro, não é uma etapa
// separada aqui.
export function resolveOnboardingStep(user: { emailVerificado: boolean; riotVerificado: boolean }, hasEquipe: boolean): OnboardingStep {
  if (!user.emailVerificado) return "verificar-email";
  if (!user.riotVerificado) return "verificar-riot";
  if (!hasEquipe) return "equipe";
  return "completo";
}
