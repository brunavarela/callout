import type { Cargo } from '@callout/shared';

export const CARGO_LABEL: Record<Cargo, string> = {
  jogador: 'Jogador',
  igl: 'IGL',
  treinador_principal: 'Treinador principal',
  treinador_assistente: 'Treinador assistente',
};

export const CARGO_OPTIONS: Cargo[] = ['jogador', 'igl', 'treinador_principal', 'treinador_assistente'];
