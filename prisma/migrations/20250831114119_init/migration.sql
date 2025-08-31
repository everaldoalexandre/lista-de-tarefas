-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
