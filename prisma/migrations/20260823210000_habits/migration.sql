CREATE TABLE "Habit" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);
DROP TABLE IF EXISTS "HabitLog";
CREATE TABLE "HabitLog" (
    "id" UUID NOT NULL,
    "habitId" UUID NOT NULL,
    "date" DATE NOT NULL,
    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;