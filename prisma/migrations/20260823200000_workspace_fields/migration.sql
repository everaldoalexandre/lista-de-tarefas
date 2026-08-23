ALTER TABLE "List" ADD COLUMN "priority" TEXT;
ALTER TABLE "List" ADD COLUMN "tags" TEXT[];
ALTER TABLE "List" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
UPDATE "List" SET "status" = 'todo' WHERE "status" = 'pending';
UPDATE "List" SET "status" = 'done' WHERE "status" = 'completed';