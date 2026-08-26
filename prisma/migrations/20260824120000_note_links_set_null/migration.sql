-- AlterForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_taskId_fkey";
ALTER TABLE "Note" ADD CONSTRAINT "Note_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "List"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_projectId_fkey";
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
