export type OnboardingStep = "verificar-email" | "verificar-riot" | "intuito" | "equipe" | "completo";

// Ordem fixa do funil de cadastro (email+senha, desde 03/09/2026) — usado
// tanto no DTO da sessão (toSessionUser) quanto nos guards de rota do front,
// pra decidir pra onde mandar a pessoa a cada passo.
export function resolveOnboardingStep(
  user: { emailVerificado: boolean; riotVerificado: boolean; intuitos: string[] },
  hasEquipe: boolean,
): OnboardingStep {
  if (!user.emailVerificado) return "verificar-email";
  if (!user.riotVerificado) return "verificar-riot";
  if (user.intuitos.length === 0) return "intuito";
  if (!hasEquipe) return "equipe";
  return "completo";
}
