import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INTUITOS, INTUITO_LABELS } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { AuthTabs } from '../components/AuthTabs';
import { DataNascimentoField } from '../components/DataNascimentoField';
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
  const [intuitos, setIntuitos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleIntuito(valor: string) {
    setIntuitos((v) => (v.includes(valor) ? v.filter((x) => x !== valor) : [...v, valor]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nome.trim().length < 2) return setError('Digita seu nome.');
    if (!dataNascimento) return setError('Digita sua data de nascimento.');
    if (!RIOT_ID_PATTERN.test(riotId)) return setError('RiotID inválido. Use nome#tag, por exemplo thiago#BR1.');
    if (senha.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (senha !== confirmarSenha) return setError('As senhas não coincidem.');
    if (intuitos.length === 0) return setError('Escolhe pelo menos uma opção em "pra que você vai usar".');

    setSubmitting(true);
    try {
      await apiFetch<{ ok: true; email: string }>('/auth/cadastro', {
        method: 'POST',
        body: JSON.stringify({ nome, dataNascimento, email, senha, confirmarSenha, riotId, intuitos }),
      });
      navigate('/cadastro/verificar-email', { state: { email, codigoJaEnviado: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar conta. Tenta de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginShell>
      <AuthTabs active="criar-conta" />
      <h1 className="login-heading" style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-.03em', margin: '0 0 16px' }}>
        Vamos te
        <br />
        conhecer.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 24px', maxWidth: '40ch' }}>
        Seu RiotID liga suas partidas à sua conta — a gente confirma que é sua daqui a pouco.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" disabled={submitting} autoComplete="name" />
        <DataNascimentoField value={dataNascimento} onChange={setDataNascimento} disabled={submitting} />
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

        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>Pra que você vai usar o callout?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {INTUITOS.map((valor) => {
            const ativo = intuitos.includes(valor);
            return (
              <button
                key={valor}
                type="button"
                onClick={() => toggleIntuito(valor)}
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md, 10px)',
                  border: `1px solid ${ativo ? 'var(--acc, #EF4958)' : 'var(--surface-border)'}`,
                  background: ativo ? 'color-mix(in srgb, var(--acc, #EF4958) 12%, var(--surface))' : 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    flex: 'none',
                    borderRadius: 5,
                    border: `1.5px solid ${ativo ? 'var(--acc, #EF4958)' : 'var(--text-faint)'}`,
                    background: ativo ? 'var(--acc, #EF4958)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                  }}
                >
                  {ativo ? '✓' : ''}
                </span>
                {INTUITO_LABELS[valor]}
              </button>
            );
          })}
        </div>

        {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} disabled={submitting} type="submit">
          <span>{submitting ? 'Criando conta…' : 'Cadastrar'}</span>
          <span>→</span>
        </button>
      </form>
    </LoginShell>
  );
}
