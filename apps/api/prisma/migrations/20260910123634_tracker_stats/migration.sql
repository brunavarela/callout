-- AlterTable
ALTER TABLE "match_players" ADD COLUMN     "accountLevel" INTEGER,
ADD COLUMN     "clutches" JSONB,
ADD COLUMN     "multiKills" JSONB,
ADD COLUMN     "weaponKills" JSONB;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "seasonId" TEXT,
ADD COLUMN     "seasonShort" TEXT;
