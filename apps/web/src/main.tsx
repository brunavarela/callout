import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { SessionProvider } from './lib/session'
import { ThemeProvider } from './lib/theme'
import './index.css'
import App from './App.tsx'

// Sem VITE_SENTRY_DSN isso é um no-op (LAUNCH.md §5 item 4, tier gratuito)
// — só passa a capturar erro de verdade quando alguém criar o projeto no
// Sentry e colar o DSN no .env.
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined, sendDefaultPii: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0F10', color: '#fff', fontFamily: 'Inter,sans-serif', fontSize: 14, flexDirection: 'column', gap: 14 }}>
          <span>Algo deu errado. Tenta recarregar a página.</span>
          <button onClick={() => window.location.reload()} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#EF4958', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Recarregar
          </button>
        </div>
      }
    >
      <BrowserRouter>
        <SessionProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </SessionProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
