-- Grandfather: contas que já têm um RiotID vinculado (grupo fechado, login
-- antigo por Discord) entram já como verificadas — não precisam repetir o
-- truque da tag temporária que só passa a existir a partir de agora.
UPDATE "users"
SET "riotVerificado" = true
WHERE "riotPuuid" IS NOT NULL;
