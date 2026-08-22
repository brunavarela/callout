-- CreateTable
CREATE TABLE "strategy_usages" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "marcadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "strategy_usages_matchId_strategyId_key" ON "strategy_usages"("matchId", "strategyId");

-- AddForeignKey
ALTER TABLE "strategy_usages" ADD CONSTRAINT "strategy_usages_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_usages" ADD CONSTRAINT "strategy_usages_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_usages" ADD CONSTRAINT "strategy_usages_marcadoPorId_fkey" FOREIGN KEY ("marcadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
