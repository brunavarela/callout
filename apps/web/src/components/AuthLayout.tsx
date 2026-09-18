import { Outlet, useLocation } from 'react-router-dom';
import { LoginShell } from './LoginShell';
import { AuthTabs } from './AuthTabs';

// Layout persistente pra /login e /cadastro -- fica montado entre as duas
// rotas, então a troca do AuthTabs (pill deslizando) anima de verdade em vez
// de já aparecer na posição final. Antes cada página remontava o
// LoginShell+AuthTabs do zero a cada navegação, então a transição nunca
// rodava.
export function AuthLayout() {
  const location = useLocation();
  const active = location.pathname === '/cadastro' ? 'criar-conta' : 'entrar';
  return (
    <LoginShell>
      <AuthTabs active={active} />
      <Outlet />
    </LoginShell>
  );
}
