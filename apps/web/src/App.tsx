import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoginStep1 } from './pages/LoginStep1';
import { LoginStep2 } from './pages/LoginStep2';
import { Dashboard } from './pages/Dashboard';
import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { Team } from './pages/Team';
import { Board } from './pages/Board';
import { Spots } from './pages/Spots';
import { Competitions } from './pages/Competitions';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginStep1 />} />
      <Route path="/login/vincular" element={<LoginStep2 />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/partidas" element={<Matches />} />
        <Route path="/partida/:id" element={<MatchDetail />} />
        <Route path="/time" element={<Team />} />
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
