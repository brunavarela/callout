/*
  Warnings:

  - You are about to drop the column `habilidade` on the `spots` table. All the data in the column will be lost.
  - You are about to drop the column `notas` on the `spots` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `spots` table. All the data in the column will be lost.
  - You are about to drop the column `xAlvo` on the `spots` table. All the data in the column will be lost.
  - You are about to drop the column `xOrigem` on the `spots` table. All the data in the column will be lost.
  - You are about to drop the column `yAlvo` on the `spots` table. All the data in the column will be lost.
  - You are about to drop the column `yOrigem` on the `spots` table. All the data in the column will be lost.
  - Added the required column `descricao` to the `spots` table without a default value. This is not possible if the table is not empty.
  - Made the column `agentUuid` on table `spots` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "spots" DROP COLUMN "habilidade",
DROP COLUMN "notas",
DROP COLUMN "videoUrl",
DROP COLUMN "xAlvo",
DROP COLUMN "xOrigem",
DROP COLUMN "yAlvo",
DROP COLUMN "yOrigem",
ADD COLUMN     "descricao" TEXT NOT NULL,
ADD COLUMN     "imagens" TEXT[],
ALTER COLUMN "agentUuid" SET NOT NULL;
