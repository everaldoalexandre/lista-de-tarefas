/*
  Warnings:

  - You are about to drop the `lista` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."lista";

-- CreateTable
CREATE TABLE "public"."Lista" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "prioridade" TEXT NOT NULL,

    CONSTRAINT "Lista_pkey" PRIMARY KEY ("id")
);
