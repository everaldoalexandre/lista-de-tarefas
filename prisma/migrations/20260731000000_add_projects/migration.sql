-- AlterTable
ALTER TABLE "public"."List" ADD COLUMN     "projectId" UUID,
ALTER COLUMN "date" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."List" ADD CONSTRAINT "List_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: assign existing tasks without a project to a "General" project per user
DO $$
DECLARE
    u RECORD;
    p_id UUID;
BEGIN
    FOR u IN SELECT DISTINCT "userId" FROM "List" WHERE "projectId" IS NULL LOOP
        p_id := gen_random_uuid();
        INSERT INTO "Project" ("id", "name", "createdAt", "userId")
        VALUES (p_id, 'General', CURRENT_TIMESTAMP, u."userId");
        UPDATE "List" SET "projectId" = p_id WHERE "userId" = u."userId" AND "projectId" IS NULL;
    END LOOP;
END $$;
