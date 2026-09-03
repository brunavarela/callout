import type { ReactNode } from 'react';

// Área de campos/botão de Login e Cadastro — altura fixa pra trocar de aba
// (Entrar/Criar conta) ou de passo (dentro do cadastro) nunca "crescer" a
// tela; só o conteúdo interno troca, animado (ver .auth-fade-in). Calibrada
// pra caber confortavelmente o passo mais alto: senha + checklist de
// requisitos + confirmar senha + botões.
export function AuthStepFrame({ animKey, children }: { animKey: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: 340, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
      <div key={animKey} className="auth-fade-in">
        {children}
      </div>
    </div>
  );
}
