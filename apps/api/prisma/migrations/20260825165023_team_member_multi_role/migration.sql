-- Função vira multi-seleção (até 2, ex.: sentinela + duelista). Nenhuma
-- linha tinha "funcao" preenchida em produção (nunca existiu UI pra
-- editar antes dessa feature), então é seguro trocar de coluna sem
-- precisar migrar dado.
ALTER TABLE "team_members" ADD COLUMN "funcoes" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "team_members" DROP COLUMN "funcao";
