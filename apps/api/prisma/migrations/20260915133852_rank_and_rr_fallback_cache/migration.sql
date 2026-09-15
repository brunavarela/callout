-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cachedPeakRankSeasonShort" TEXT,
ADD COLUMN     "cachedPeakRankTierLabel" TEXT,
ADD COLUMN     "cachedRankIconUrl" TEXT,
ADD COLUMN     "cachedRankRr" INTEGER,
ADD COLUMN     "cachedRankTierLabel" TEXT,
ADD COLUMN     "cachedRankUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "lastMmrHistoryAt" TIMESTAMP(3),
ADD COLUMN     "lastMmrHistoryJson" JSONB;
