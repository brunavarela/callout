-- MembroEquipe.isAdmin (equipe_perfil_e_cargo) entrou com default false pra
-- todo mundo, inclusive quem já era dono de time antes desse campo existir
-- (== produção, hoje). Dono sempre foi admin de fato (decisão de
-- 01/09/2026) -- promove quem ainda estiver false. Idempotente.
UPDATE "team_members" tm
SET "isAdmin" = true
FROM "teams" t
WHERE tm."teamId" = t.id AND tm."userId" = t."ownerId" AND tm."isAdmin" = false;
