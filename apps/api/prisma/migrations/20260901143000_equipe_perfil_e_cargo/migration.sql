-- AlterTable
ALTER TABLE "team_members" ADD COLUMN     "cargo" TEXT NOT NULL DEFAULT 'jogador',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "imagemUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "displayName" TEXT;
