import type { OnboardingStep } from '@callout/shared';

// Espelha resolveOnboardingStep do backend (apps/api/src/lib/onboarding.ts)
// — só decide pra onde navegar a partir do SessionUser.proximoPasso que a
// API já calcula, sem duplicar a lógica de decisão em si.
export function routeForStep(step: OnboardingStep): string {
  switch (step) {
    case 'verificar-email':
      return '/cadastro/verificar-email';
    case 'verificar-riot':
      return '/cadastro/verificar-riot';
    case 'equipe':
      return '/login/equipe';
    case 'completo':
      return '/';
  }
}
