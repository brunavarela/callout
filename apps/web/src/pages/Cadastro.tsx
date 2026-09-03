import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INTUITOS, INTUITO_LABELS } from '@callout/shared';
import { LoginShell } from '../components/LoginShell';
import { AuthTabs } from '../components/AuthTabs';
import { AuthStepFrame } from '../components/AuthStepFrame';
import { DataNascimentoField } from '../components/DataNascimentoField';
import { PasswordField } from '../components/PasswordField';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { senhaValida } from '../lib/senha';
import { apiFetch, ApiError } from '../lib/api';

const RIOT_ID_PATTERN = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL_STEPS = 4;

export function Cadastro() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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

  function goBack() {
    setError(null);
    setStep((v) => Math.max(0, v - 1));
  }

  function handleAvancar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (step === 0) {
      if (nome.trim().length < 2) return setError('Digita seu nome.');
      if (!dataNascimento) return setError('Digita sua data de nascimento.');
      setStep(1);
    } else if (step === 1) {
      if (!RIOT_ID_PATTERN.test(riotId)) return setError('RiotID inválido. Use nome#tag, por exemplo thiago#BR1.');
      if (!EMAIL_PATTERN.test(email)) return setError('Email inválido.');
      setStep(2);
    } else if (step === 2) {
      if (!senhaValida(senha)) return setError('Sua senha ainda não atende todos os requisitos abaixo.');
      if (senha !== confirmarSenha) return setError('As senhas não coincidem.');
      setStep(3);
    }
  }

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (intuitos.length === 0) return setError('Escolhe pelo menos uma opção.');

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
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 20px', maxWidth: '40ch' }}>
        Seu RiotID liga suas partidas à sua conta — a gente confirma que é sua daqui a pouco.
      </p>

      <AuthStepFrame animKey={`step-${step}`}>
        <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--text-dim)', marginBottom: 14 }}>
          PASSO {step + 1} DE {TOTAL_STEPS}
        </div>

        {step === 0 && (
          <form onSubmit={handleAvancar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" autoComplete="name" autoFocus />
            <DataNascimentoField value={dataNascimento} onChange={setDataNascimento} />
            {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'space-between' }} type="submit">
              <span>Continuar</span>
              <span>→</span>
            </button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleAvancar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input-field" value={riotId} onChange={(e) => setRiotId(e.target.value)} placeholder="RiotID — thiago#BR1" autoFocus />
            <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
            {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={goBack}>
                ← Voltar
              </button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'space-between' }} type="submit">
                <span>Continuar</span>
                <span>→</span>
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleAvancar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PasswordField value={senha} onChange={setSenha} placeholder="Senha" autoComplete="new-password" autoFocus />
            <PasswordRequirements senha={senha} />
            <PasswordField value={confirmarSenha} onChange={setConfirmarSenha} placeholder="Confirmar senha" autoComplete="new-password" />
            {error && <div style={{ fontSize: 13, color: 'var(--acc, #EF4958)' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={goBack}>
                ← Voltar
              </button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'space-between' }} type="submit">
                <span>Continuar</span>
                <span>→</span>
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleCadastrar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Pra que você vai usar o callout?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {INTUITOS.map((valor) => {
                const ativo = intuitos.includes(valor);
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => toggleIntuito(valor)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'left',
                      padding: '9px 10px',
                      borderRadius: 'var(--radius-md, 10px)',
                      border: `1px solid ${ativo ? 'var(--acc, #EF4958)' : 'var(--surface-border)'}`,
                      background: ativo ? 'color-mix(in srgb, var(--acc, #EF4958) 12%, var(--surface))' : 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 12,
                      lineHeight: 1.25,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 15,
                        height: 15,
                        flex: 'none',
                        borderRadius: 4,
                        border: `1.5px solid ${ativo ? 'var(--acc, #EF4958)' : 'var(--text-faint)'}`,
                        background: ativo ? 'var(--acc, #EF4958)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 10,
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
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              <button type="button" className="btn-secondary" onClick={goBack} disabled={submitting}>
                ← Voltar
              </button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'space-between' }} disabled={submitting} type="submit">
                <span>{submitting ? 'Criando conta…' : 'Cadastrar'}</span>
                <span>→</span>
              </button>
            </div>
          </form>
        )}
      </AuthStepFrame>
    </LoginShell>
  );
}
