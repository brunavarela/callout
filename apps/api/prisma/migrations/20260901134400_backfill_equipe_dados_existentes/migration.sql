-- Backfill pra bancos que já tinham time/spot antes do multi-tenancy
-- (== produção, hoje). Roda ENTRE team_multi_tenancy_1 (colunas nullable) e
-- team_multi_tenancy_2 (NOT NULL) de propósito: sem isso, a migration
-- seguinte falharia num banco com linha antiga (teamId/inviteCode NULL).
-- Idempotente -- em bancos que já passaram por isso manualmente (dev),
-- os WHERE ... IS NULL não acham nada pra tocar.

-- Cada Team sem inviteCode ganha um código gerado (8 chars, mesmo formato
-- de gerarCodigoConvite em lib/equipe.ts).
UPDATE "teams"
SET "inviteCode" = upper(substr(md5(random()::text || id || clock_timestamp()::text), 1, 8))
WHERE "inviteCode" IS NULL;

-- Spot sem teamId (era global antes desta migration) vai pro único time
-- que existir. Se por algum motivo já existir mais de um time nesse ponto,
-- para e avisa em vez de chutar de qual time era cada spot antigo.
DO $$
DECLARE
  team_count integer;
  only_team_id text;
BEGIN
  SELECT count(*) INTO team_count FROM "teams";

  IF team_count > 1 THEN
    RAISE EXCEPTION 'Mais de um time já existe (%) -- backfill manual necessário pra Spot.teamId.', team_count;
  END IF;

  IF team_count = 1 THEN
    SELECT id INTO only_team_id FROM "teams" LIMIT 1;
    UPDATE "spots" SET "teamId" = only_team_id WHERE "teamId" IS NULL;
  END IF;
END $$;
