-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "competicoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "categorias" TEXT[],
    "fase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "linkTwitch" TEXT,
    "linkYoutube" TEXT,

    CONSTRAINT "competicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competicao_times" (
    "id" TEXT NOT NULL,
    "competicaoId" TEXT NOT NULL,
    "timeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "cor" TEXT NOT NULL,

    CONSTRAINT "competicao_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confrontos" (
    "id" TEXT NOT NULL,
    "competicaoId" TEXT NOT NULL,
    "confrontoId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "ladoA" JSONB NOT NULL,
    "ladoB" JSONB NOT NULL,
    "placarA" INTEGER,
    "placarB" INTEGER,

    CONSTRAINT "confrontos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competicao_times_competicaoId_timeId_key" ON "competicao_times"("competicaoId", "timeId");

-- CreateIndex
CREATE UNIQUE INDEX "confrontos_competicaoId_confrontoId_key" ON "confrontos"("competicaoId", "confrontoId");

-- AddForeignKey
ALTER TABLE "competicao_times" ADD CONSTRAINT "competicao_times_competicaoId_fkey" FOREIGN KEY ("competicaoId") REFERENCES "competicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confrontos" ADD CONSTRAINT "confrontos_competicaoId_fkey" FOREIGN KEY ("competicaoId") REFERENCES "competicoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
