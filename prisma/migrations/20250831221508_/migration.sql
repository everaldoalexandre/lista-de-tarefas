/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "public"."lista" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,

    CONSTRAINT "lista_pkey" PRIMARY KEY ("id")
);
