/*
  Warnings:

  - You are about to drop the column `image` on the `user` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Lista` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Lista" ADD COLUMN     "userId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "image";

-- AddForeignKey
ALTER TABLE "public"."Lista" ADD CONSTRAINT "Lista_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
