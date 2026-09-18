export type OnboardingStep = "verificar-email" | "equipe" | "completo";

// Ordem fixa do funil de cadastro (email+senha, desde 03/09/2026) — usado
// tanto no DTO da sessão (toSessionUser) quanto nos guards de rota do front,
// pra decidir pra onde mandar a pessoa a cada passo.
//
// A prova de posse do RiotID (trocar a tag temporariamente) saiu do funil
// em 18/09/2026 -- sem acesso à API oficial da Riot pra verificar de
// verdade, não compensava o atrito extra. `riotVerificado` continua no
// banco (sempre true pra conta nova, ver POST /auth/cadastro) só pra não
// quebrar quem já tinha cadastro antes disso.
//
// A etapa "equipe" também saiu do funil obrigatório em 18/09/2026 -- só
// aparece pra quem marcou o intuito "administrar_equipe" ("Criar
// equipe/participar de equipe") no cadastro. Quem não marcou termina o
// cadastro sem equipe nenhuma e cria/entra depois, quando quiser, pela
// própria tela de Equipe (ver EquipeSetupForm.tsx no front).
export function resolveOnboardingStep(user: { emailVerificado: boolean; intuitos: string[] }, hasEquipe: boolean): OnboardingStep {
  if (!user.emailVerificado) return "verificar-email";
  if (!hasEquipe && user.intuitos.includes("administrar_equipe")) return "equipe";
  return "completo";
}
