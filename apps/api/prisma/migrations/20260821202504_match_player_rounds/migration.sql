/*
  Warnings:

  - Added the required column `roundsPlayed` to the `match_players` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "match_players" ADD COLUMN     "roundsPlayed" INTEGER NOT NULL;
