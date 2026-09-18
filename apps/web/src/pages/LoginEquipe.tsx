import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginShell } from '../components/LoginShell';
import { EquipeSetupForm } from '../components/EquipeSetupForm';
import { useSession } from '../lib/session';
import { routeForStep } from '../lib/onboarding';

export function LoginEquipe() {
  const navigate = useNavigate();
  const { user, loading, logout, refresh } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // Essa etapa só existe pra quem marcou "administrar_equipe" no cadastro
    // e ainda não tem equipe (ver resolveOnboardingStep) -- se por algum
    // motivo a pessoa cair aqui fora disso (já tem equipe, ou nem queria
    // uma), manda pro passo certo em vez de forçar o formulário.
    if (user.proximoPasso !== 'equipe') navigate(routeForStep(user.proximoPasso), { replace: true });
  }, [loading, user, navigate]);

  async function handleDone() {
    await refresh();
    navigate('/');
  }

  async function handleTrocar(e: React.MouseEvent) {
    e.preventDefault();
    await logout();
    navigate('/login');
  }

  return (
    <LoginShell>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--acc, #EF4958)', marginBottom: 18 }}>ETAPA 2 DE 2</div>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Monte
        <br />
        sua equipe.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 24px', maxWidth: '38ch' }}>
        Crie uma equipe nova ou entre numa que já existe com o código de convite.
      </p>

      <EquipeSetupForm onDone={handleDone} />

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
        Entrou como <span style={{ color: 'var(--text-muted)' }}>{user?.nome ?? '…'}</span> ·{' '}
        <a href="#" onClick={handleTrocar}>
          trocar
        </a>
      </div>
    </LoginShell>
  );
}
