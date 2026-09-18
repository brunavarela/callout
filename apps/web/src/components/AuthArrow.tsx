import { LogoMark } from './Logo';

// Mira branca da logo, usada no lugar da setinha "→" nos botões de avançar
// das telas de login/cadastro (fundo vermelho do .btn-primary).
export function AuthArrow() {
  return (
    <span style={{ color: '#fff', display: 'inline-flex' }}>
      <LogoMark size={26} weight={3} dotColor="#fff" />
    </span>
  );
}
