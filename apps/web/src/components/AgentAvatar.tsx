import { agentImageUrl } from '../lib/agentImages';

// Ícone quadrado do agente — usado no histórico de partidas (time e
// individual). Cai pras iniciais quando não tem imagem (agente novo demais).
export function AgentAvatar({ agent, size, title }: { agent: string; size: number; title?: string }) {
  const imageUrl = agentImageUrl(agent);
  return (
    <div
      title={title ?? agent}
      style={{
        width: size,
        height: size,
        borderRadius: size >= 30 ? 9 : 7,
        overflow: 'hidden',
        flex: 'none',
        background: imageUrl ? '#141415' : 'var(--avatar-bg)',
        border: '1px solid var(--surface-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size >= 30 ? 9 : 7,
        fontWeight: 700,
        color: 'var(--text-muted)',
      }}
    >
      {imageUrl ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : agent.slice(0, 2).toUpperCase()}
    </div>
  );
}
