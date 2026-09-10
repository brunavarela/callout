-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailPendente" TEXT,
ADD COLUMN     "exibirRiotIdComoNome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "riotNamePendente" TEXT,
ADD COLUMN     "riotPuuidPendente" TEXT,
ADD COLUMN     "riotRegionPendente" TEXT,
ADD COLUMN     "riotTagPendente" TEXT;
