import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginShell } from '../components/LoginShell';
import { apiFetch, ApiError } from '../lib/api';

const RIOT_ID_PATTERN = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;

export function Cadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [riotId, setRiotId] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nome.trim().length < 2) return setError('Digita seu nome.');
    if (!dataNascimento) return setError('Digita sua data de nascimento.');
    if (!RIOT_ID_PATTERN.test(riotId)) return setError('RiotID inválido. Use nome#tag, por exemplo thiago#BR1.');
    if (senha.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (senha !== confirmarSenha) return setError('As senhas não coincidem.');

    setSubmitting(true);
    try {
      await apiFetch<{ ok: true; email: string }>('/auth/cadastro', {
        method: 'POST',
        body: JSON.stringify({ nome, dataNascimento, email, senha, confirmarSenha, riotId }),
      });
      navigate('/cadastro/verificar-email', { state: { email } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar conta. Tenta de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginShell>
      <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 18 }}>CRIAR CONTA</div>
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Vamos te
        <br />
        conhecer.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: '40ch' }}>
        Seu RiotID liga suas partidas à sua conta — a gente confirma que é sua daqui a pouco.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" disabled={submitting} autoComplete="name" />
        <input
          className="input-field"
          type="date"
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
          disabled={submitting}
          max={new Date().toISOString().slice(0, 10)}
        />
        <input className="input-field" value={riotId} onChange={(e) => setRiotId(e.target.value)} placeholder="RiotID — thiago#BR1" disabled={submitting} />
        <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" disabled={submitting} autoComplete="email" />
        <input
          className="input-field"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha (mín. 8 caracteres)"
          disabled={submitting}
          autoComplete="new-password"
        />
        <input
          className="input-field"
          type="password"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          placeholder="Confirmar senha"
          disabled={submitting}
          autoComplete="new-password"
        />
        {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} disabled={submitting} type="submit">
          <span>{submitting ? 'Criando conta…' : 'Criar conta'}</span>
          <span>→</span>
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </div>
    </LoginShell>
  );
}
