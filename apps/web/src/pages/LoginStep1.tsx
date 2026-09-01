import { useSearchParams } from 'react-router-dom';
import { LoginShell } from '../components/LoginShell';
import { API_URL } from '../lib/api';

const ERROR_MESSAGES: Record<string, string> = {
  'fora-do-servidor': 'Sua conta do Discord não está no servidor do grupo — só quem está no servidor entra.',
  'falha-login': 'Não deu pra completar o login com o Discord. Tenta de novo.',
};

export function LoginStep1() {
  const [searchParams] = useSearchParams();
  const erro = searchParams.get('erro');

  return (
    <LoginShell>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 18 }}>ETAPA 1 DE 3</div>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        O que a memória
        <br />
        não guarda.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 36px', maxWidth: '38ch', textWrap: 'pretty' }}>
        Suas últimas 30 partidas e as estratégias que o time desenhou. Entre com o Discord do grupo.
      </p>
      <a className="btn-primary" style={{ width: '100%' }} href={`${API_URL}/auth/discord`}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#5865F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src="/img/discord-mark-white.svg" alt="" width={14} height={14} style={{ display: 'block' }} />
        </span>
        Entrar com Discord
        <span style={{ marginLeft: 'auto', fontSize: 14 }}>→</span>
      </a>
      {erro && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--acc, #EF4958)' }}>{ERROR_MESSAGES[erro] ?? 'Algo deu errado no login.'}</div>
      )}
      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>Só quem está no servidor entra. Sem senha, sem cadastro.</div>
    </LoginShell>
  );
}
