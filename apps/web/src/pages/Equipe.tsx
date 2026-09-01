import { useNavigate, useOutletContext } from 'react-router-dom';
import { Settings, History, BarChart3 } from 'lucide-react';
import type { MembroEquipeCard } from '@callout/shared';
import type { OutletContext } from '../components/AppShell';
import { LoadingFill } from '../components/Spinner';
import { MainAgentIcons } from '../components/MainAgentIcons';
import { CARGO_LABEL } from '../lib/cargo';

const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--surface-border)' };

function initialsOf(name: string) {
  return name.slice(0, 2).toUpperCase();
}

// Mesmas colunas (e mesmo espaçamento) da tabela de Membros em
// /equipe/configuracoes, só sem os 3 pontinhos — aqui é só retrato da
// equipe, nada clicável/editável. `minmax(piso, 1fr)` — cada coluna nunca
// fica menor que o próprio conteúdo, e o espaço sobrando na linha é
// dividido em partes iguais entre elas, em vez de tudo empilhado à
// esquerda ou de uma coluna esticar mais que as outras.
const ROW_COLUMNS = '36px minmax(140px,1fr) 90px minmax(120px,1fr) minmax(150px,1fr) minmax(140px,1fr) minmax(90px,1fr)';
const ROW_GAP = 28;

function MemberRow({ member }: { member: MembroEquipeCard }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: ROW_COLUMNS, gap: ROW_GAP, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--divider)', fontSize: 13 }}>
      <div
        style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'var(--avatar-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}
      >
        {member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(member.name)}
      </div>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {member.name}
        {member.isSelf && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--text-faint)' }}>(você)</span>}
      </span>
      <MainAgentIcons agents={member.mainAgents} />
      <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.riotIdLabel ?? '—'}</span>
      <span style={{ color: 'var(--text-muted)' }}>{CARGO_LABEL[member.cargo]}</span>
      <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {member.roles.length ? member.roles.map((r) => r[0]!.toUpperCase() + r.slice(1)).join(', ') : '—'}
      </span>
      <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{member.joinedAtLabel}</span>
    </div>
  );
}

export function Equipe() {
  const navigate = useNavigate();
  const { equipe, equipeError, reloadEquipe } = useOutletContext<OutletContext>();

  if (equipeError && !equipe) {
    return (
      <div style={{ padding: 26 }}>
        <div style={{ ...cardStyle, padding: 22, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{equipeError}</div>
          <button className="btn-secondary" onClick={reloadEquipe}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!equipe) {
    return (
      <div style={{ padding: 26, display: 'flex', flexDirection: 'column' }}>
        <LoadingFill />
      </div>
    );
  }

  const isAdmin = equipe.members.find((m) => m.isSelf)?.isAdmin ?? false;

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div
          style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', background: 'var(--avatar-bg)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' }}
        >
          {equipe.imagemUrl ? <img src={equipe.imagemUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(equipe.name)}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-.025em', margin: 0 }}>{equipe.name}</h1>
            {isAdmin && (
              <button
                onClick={() => navigate('/equipe/configuracoes')}
                title="Configurações da equipe"
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <Settings size={18} strokeWidth={1.75} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{equipe.descricao || 'Sem descrição ainda.'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
            {equipe.memberCount} membros · {equipe.matchesTogether30d} partidas juntos nos últimos 30 dias · {equipe.groupWinratePercent}% de winrate em grupo
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => navigate('/equipe/painel')}>
            <BarChart3 size={15} strokeWidth={1.75} />
            Painel da equipe
          </button>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => navigate('/equipe/partidas')}>
            <History size={15} strokeWidth={1.75} />
            Histórico de partidas
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: '18px 20px' }}>
        {equipe.members.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Ninguém na equipe ainda.</div>
        ) : (
          <div className="scroll-x-mobile">
            <div style={{ minWidth: 960 }}>
              <div style={{ display: 'grid', gridTemplateColumns: ROW_COLUMNS, gap: ROW_GAP, padding: '0 0 8px', fontSize: 9.5, letterSpacing: '.08em', color: 'var(--text-faint)' }}>
                <span />
                <span>NOME</span>
                <span>AGENTES</span>
                <span>APELIDO</span>
                <span>CARGO</span>
                <span>FUNÇÃO</span>
                <span>ENTROU EM</span>
              </div>
              {equipe.members.map((m) => (
                <MemberRow key={m.userId} member={m} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
