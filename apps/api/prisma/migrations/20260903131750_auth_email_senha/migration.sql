-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dataNascimento" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intuitos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "riotVerificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senhaHash" TEXT,
ALTER COLUMN "discordId" DROP NOT NULL,
ALTER COLUMN "discordUsername" DROP NOT NULL;

-- CreateTable
CREATE TABLE "auth_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "auth_codes" ADD CONSTRAINT "auth_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
