import type { MembroEquipeCard } from '@callout/shared';
import { agentImageUrl } from '../lib/agentImages';

// Carinhas dos agentes principais (selecionados no modal de Função) — até
// MAX_MAIN_AGENTS, mesmo ícone usado no resto do app (agentImageUrl).
// Compartilhado entre a tela inicial da equipe (Equipe.tsx, só leitura) e
// Configurações (EquipeConfiguracoes.tsx, com o lápis de editar ao lado).
export function MainAgentIcons({ agents }: { agents: MembroEquipeCard['mainAgents'] }) {
  if (agents.length === 0) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {agents.map((a) => {
        const imageUrl = agentImageUrl(a.name);
        return (
          <div
            key={a.uuid}
            title={a.name}
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              overflow: 'hidden',
              flex: 'none',
              background: imageUrl ? '#141415' : 'var(--avatar-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 7,
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            {imageUrl ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.name.slice(0, 2).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}
