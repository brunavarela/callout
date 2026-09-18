// "Tela de entrada" — feedback de carregamento cheio (spinner + mensagem)
// que cobre o app inteiro logo depois de criar conta, criar equipe ou
// entrar numa equipe, até a Visão do ato (o que a Dashboard mostra de
// cara) terminar de carregar de verdade. Sem isso, a pessoa cai direto na
// dashboard vazia por um instante enquanto os dados ainda chegam.
//
// sessionStorage (não estado em memória) de propósito: o gatilho (ex.:
// LoginEquipe.tsx) e quem lê (AppShell.tsx) são componentes diferentes que
// não compartilham estado entre si nesse ponto exato da navegação — o
// primeiro navega pra "/" e desmonta antes do AppShell montar.
const KEY = 'callout:entrando';

export function marcarEntrando(mensagem: string) {
  try {
    sessionStorage.setItem(KEY, mensagem);
  } catch {
    // sem sessionStorage (modo privado etc.) — só não mostra o feedback, sem quebrar o fluxo
  }
}

export function lerEntrando(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function limparEntrando() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // idem
  }
}
