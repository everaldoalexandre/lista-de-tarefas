CREATE TABLE "SubTask" (
    "id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER,
    "taskId" UUID NOT NULL,
    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubTask_taskId_idx" ON "SubTask"("taskId");
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;