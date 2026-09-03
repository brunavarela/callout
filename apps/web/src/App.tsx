import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Login } from './pages/Login';
import { Cadastro } from './pages/Cadastro';
import { VerificarEmail } from './pages/VerificarEmail';
import { VerificarRiotId } from './pages/VerificarRiotId';
import { Intuito } from './pages/Intuito';
import { LoginEquipe } from './pages/LoginEquipe';
import { Dashboard } from './pages/Dashboard';
import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { Equipe } from './pages/Equipe';
import { EquipePartidas } from './pages/EquipePartidas';
import { EquipePainel } from './pages/EquipePainel';
import { EquipeConfiguracoes } from './pages/EquipeConfiguracoes';
import { Board } from './pages/Board';
import { Spots } from './pages/Spots';
import { Competitions } from './pages/Competitions';
import { Termos } from './pages/Termos';
import { Privacidade } from './pages/Privacidade';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/cadastro/verificar-email" element={<VerificarEmail />} />
      <Route path="/cadastro/verificar-riot" element={<VerificarRiotId />} />
      <Route path="/cadastro/intuito" element={<Intuito />} />
      <Route path="/login/equipe" element={<LoginEquipe />} />
      <Route path="/termos" element={<Termos />} />
      <Route path="/privacidade" element={<Privacidade />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/partidas" element={<Matches />} />
        <Route path="/partida/:id" element={<MatchDetail />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/equipe/configuracoes" element={<EquipeConfiguracoes />} />
        <Route path="/equipe/partidas" element={<EquipePartidas />} />
        <Route path="/equipe/painel" element={<EquipePainel />} />
        <Route path="/board" element={<Board />} />
        <Route path="/board/:id" element={<Board />} />
        <Route path="/spots" element={<Spots />} />
        <Route path="/competicoes" element={<Competitions />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
