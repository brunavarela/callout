import { useNavigate } from 'react-router-dom';

export function AuthTabs({ active }: { active: 'entrar' | 'criar-conta' }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        marginBottom: 24,
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md, 10px)',
        padding: 4,
      }}
    >
      {(
        [
          { key: 'entrar', label: 'Entrar', to: '/login' },
          { key: 'criar-conta', label: 'Criar conta', to: '/cadastro' },
        ] as const
      ).map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => navigate(tab.to)}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            background: active === tab.key ? 'var(--acc, #EF4958)' : 'transparent',
            color: active === tab.key ? '#fff' : 'var(--text-muted)',
            transition: 'background .15s ease, color .15s ease',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
