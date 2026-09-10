import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, User, Palette } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useSession } from '../lib/session';
import { Switch } from './Switch';
import { ProfileModal } from './ProfileModal';
import { ThemeModal } from './ThemeModal';

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 8px',
        background: 'none',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text)',
        fontSize: 13.5,
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'left',
      }}
      className="strat-item"
    >
      {icon}
      {label}
    </button>
  );
}

export function AccountMenu({ className, onClose }: { className: string; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const { user, logout, adminMode, setAdminMode } = useSession();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [togglingMode, setTogglingMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  async function toggleLightMode(v: boolean) {
    setTogglingMode(true);
    try {
      await setTheme({ ...theme, mode: v ? 'light' : 'dark' });
    } finally {
      setTogglingMode(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <div
        className={className}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          zIndex: 10,
          boxShadow: '0 12px 28px rgba(0,0,0,.5)',
        }}
      >
        <MenuItem icon={<User size={15} strokeWidth={1.75} color="var(--text-muted)" />} label="Perfil" onClick={() => setProfileOpen(true)} />
        <MenuItem icon={<Palette size={15} strokeWidth={1.75} color="var(--text-muted)" />} label="Tema" onClick={() => setThemeOpen(true)} />

        <div style={{ borderTop: '1px solid var(--surface-border)', margin: '6px 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
            {theme.mode === 'light' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
            Tema claro
          </span>
          <Switch checked={theme.mode === 'light'} disabled={togglingMode} onChange={toggleLightMode} />
        </div>

        {user?.isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 8px' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Administrador</span>
            <Switch checked={adminMode} onChange={setAdminMode} />
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--surface-border)', margin: '6px 4px' }} />

        <button
          onClick={() => setConfirmingLogout(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: 'none',
            border: 'none',
            padding: '9px 8px',
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--acc, #EF4958)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sair da conta
        </button>
      </div>

      {profileOpen && (
        <ProfileModal
          onClose={() => {
            setProfileOpen(false);
            onClose();
          }}
        />
      )}
      {themeOpen && (
        <ThemeModal
          onClose={() => {
            setThemeOpen(false);
            onClose();
          }}
        />
      )}

      {confirmingLogout && (
        <div
          onClick={() => !loggingOut && setConfirmingLogout(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 22,
              width: 320,
              maxWidth: '90vw',
              boxShadow: '0 12px 28px rgba(0,0,0,.5)',
            }}
          >
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: 16 }}>Sair da conta?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8 }}>
              Você vai precisar entrar de novo pra acessar o callout.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setConfirmingLogout(false)}
                disabled={loggingOut}
                className="btn-secondary"
                style={{ flex: 1, padding: 10, fontSize: 13, justifyContent: 'center' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn-primary"
                style={{ flex: 1, padding: 10, fontSize: 13, justifyContent: 'center', opacity: loggingOut ? 0.6 : 1 }}
              >
                {loggingOut ? 'Saindo…' : 'Sair'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
