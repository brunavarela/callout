-- AlterTable
ALTER TABLE "spots" ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "team_members_userId_key" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_inviteCode_key" ON "teams"("inviteCode");

-- AddForeignKey
ALTER TABLE "spots" ADD CONSTRAINT "spots_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
