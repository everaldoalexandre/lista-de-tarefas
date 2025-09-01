/*
  Warnings:

  - Made the column `status` on table `Lista` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Lista" ALTER COLUMN "status" SET NOT NULL;
