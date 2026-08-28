-- AlterTable
ALTER TABLE "users" ADD COLUMN     "themeMode" TEXT NOT NULL DEFAULT 'dark',
DROP COLUMN "themeTintedCards";
