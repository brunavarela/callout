import { useNavigate } from 'react-router-dom';
import { LoginShell } from '../components/LoginShell';

export function LoginStep1() {
  const navigate = useNavigate();

  return (
    <LoginShell>
      <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 20 }}>
        ETAPA 1 DE 2
      </div>
      <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 52, lineHeight: 1.05, letterSpacing: '-.03em', margin: '0 0 18px' }}>
        O que a memória
        <br />
        não guarda.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 40px', maxWidth: '38ch', textWrap: 'pretty' }}>
        Suas últimas 30 partidas e as estratégias que o time desenhou. Entre com o Discord do grupo.
      </p>
      <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/login/vincular')}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(30,34,37,.18)', display: 'block' }} />
        Entrar com Discord
        <span style={{ marginLeft: 'auto', fontFamily: 'Inter,sans-serif', fontSize: 13 }}>→</span>
      </button>
      <div style={{ marginTop: 18, fontSize: 13, color: 'var(--text-dim)' }}>Só quem está no servidor entra. Sem senha, sem cadastro.</div>
    </LoginShell>
  );
}
