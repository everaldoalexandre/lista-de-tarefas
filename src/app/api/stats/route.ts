import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function computeBestStreak(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let current = 0;
  let previous: number | null = null;
  for (const d of sorted) {
    const time = new Date(`${d}T00:00:00Z`).getTime();
    if (previous !== null && time - previous === 86_400_000) {
      current++;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previous = time;
  }
  return best;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated user" }, { status: 401 });
  }

  const [doneTasks, habitLogs, minutesAgg, habits] = await Promise.all([
    prisma.list.count({ where: { userId: session.user.id, status: "done" } }),
    prisma.habitLog.count({ where: { habit: { userId: session.user.id } } }),
    prisma.timeEntry.aggregate({
      _sum: { minutes: true },
      where: { userId: session.user.id },
    }),
    prisma.habit.findMany({
      where: { userId: session.user.id },
      select: {
        logs: { select: { date: true } },
      },
    }),
  ]);

  const focusMinutes = minutesAgg._sum.minutes ?? 0;

  const xp = doneTasks * 15 + habitLogs * 10 + Math.floor(focusMinutes / 25) * 20;
  const level = Math.floor(Math.sqrt(xp) / 10) + 1;
  const nextLevelXp = Math.pow(level * 10, 2);
  const currentLevelXp = Math.pow((level - 1) * 10, 2);

  const allHabitDates = habits.flatMap((h) => h.logs.map((l) => l.date.toISOString().slice(0, 10)));
  const bestStreak = computeBestStreak(allHabitDates);

  const achievements = [
    { key: "first-steps", label: "First Steps", description: "Complete your first task", earned: doneTasks >= 1 },
    { key: "week-warrior", label: "Week Warrior", description: "7-day habit streak", earned: bestStreak >= 7 },
    { key: "centurion", label: "Centurion", description: "100-day habit streak", earned: bestStreak >= 100 },
    { key: "focused", label: "Deep Focus", description: "Log your first Pomodoro", earned: focusMinutes >= 25 },
    { key: "task-master", label: "Task Master", description: "Complete 50 tasks", earned: doneTasks >= 50 },
    { key: "level-5", label: "Rising Star", description: "Reach level 5", earned: level >= 5 },
  ];

  return NextResponse.json({
    xp,
    level,
    levelProgress: Math.min(100, Math.round(((xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)) * 100)),
    stats: { doneTasks, habitLogs, focusMinutes, bestStreak },
    achievements,
  });
}
