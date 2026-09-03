import { useNavigate } from 'react-router-dom';

const TABS = [
  { key: 'entrar', label: 'Entrar', to: '/login' },
  { key: 'criar-conta', label: 'Criar conta', to: '/cadastro' },
] as const;

export function AuthTabs({ active }: { active: 'entrar' | 'criar-conta' }) {
  const navigate = useNavigate();
  const activeIndex = TABS.findIndex((t) => t.key === active);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        marginBottom: 24,
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md, 10px)',
        padding: 4,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 4,
          width: `calc(50% - 4px)`,
          borderRadius: 8,
          background: 'var(--acc, #EF4958)',
          transform: `translateX(${activeIndex * 100}%)`,
          transition: 'transform .32s cubic-bezier(.16, 1, .3, 1)',
        }}
      />
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => navigate(tab.to)}
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            padding: '8px 0',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: active === tab.key ? '#fff' : 'var(--text-muted)',
            transition: 'color .2s ease',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
