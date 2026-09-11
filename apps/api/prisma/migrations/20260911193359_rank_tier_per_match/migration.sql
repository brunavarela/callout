-- AlterTable
ALTER TABLE "match_players" ADD COLUMN     "rankTierId" INTEGER;

-- CreateTable
CREATE TABLE "rank_tiers" (
    "id" TEXT NOT NULL,
    "tierId" INTEGER NOT NULL,
    "tierName" TEXT NOT NULL,
    "smallIcon" TEXT,

    CONSTRAINT "rank_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rank_tiers_tierId_key" ON "rank_tiers"("tierId");

