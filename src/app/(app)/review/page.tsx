'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Task = { id: string; description: string; status: string; date: string | null; priority?: string | null; tags?: string[] };
type Habit = { id: string; name: string; doneDates: string[] };

export default function ReviewPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [timer, setTimer] = useState<{ byDay: Record<string, number>; weekTotal: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks?all=1').then((r) => (r.ok ? r.json() : { list: [] })),
      fetch('/api/habits').then((r) => (r.ok ? r.json() : { habits: [] })),
      fetch('/api/timer').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([t, h, tm]) => {
        setTasks(t.list ?? []);
        setHabits(h.habits ?? []);
        setTimer(tm);
      })
      .finally(() => setLoading(false));
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  function completedOn(day: string) {
    return tasks.filter(
      (t) => t.status === 'done' && (t as unknown as { updatedAt?: string }).updatedAt?.slice(0, 10) === day
    ).length;
  }

  const completedBars = days.map(completedOn);
  const maxCompleted = Math.max(1, ...completedBars);

  const overdue = tasks.filter(
    (t) => t.date && new Date(`${t.date}T23:59:59`) < new Date() && t.status !== 'done'
  );

  const tagCounts: Record<string, number> = {};
  for (const t of tasks) {
    for (const tag of t.tags ?? []) {
      if (t.status !== 'done') tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const todayKey = days[6];
  const habitDoneToday = habits.filter((h) => h.doneDates.includes(todayKey)).length;

  const hourBars = timer ? days.map((d) => Math.round(((timer.byDay[d] ?? 0) / 60) * 10) / 10) : [];
  const maxHours = Math.max(1, ...hourBars);

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
          <h1 className="text-lg font-bold text-foreground">Weekly Review</h1>
          <span className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
        {loading && <div className="h-40 rounded-xl bg-muted animate-pulse" />}

        {!loading && (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Overdue</p>
                <p className={`mt-1 text-3xl font-bold ${overdue.length > 0 ? 'text-destructive' : 'text-foreground'}`}>{overdue.length}</p>
                <p className="text-xs text-muted-foreground">tasks past due date</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Focus time</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{Math.floor((timer?.weekTotal ?? 0) / 60)}h {(timer?.weekTotal ?? 0) % 60}m</p>
                <p className="text-xs text-muted-foreground">this week</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Habits today</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{habitDoneToday}/{habits.length || 0}</p>
                <p className="text-xs text-muted-foreground">completed</p>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">Tasks completed per day</h2>
              <div className="flex items-end gap-2 h-32">
                {days.map((day, i) => (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">{completedBars[i] || ''}</span>
                    <div
                      className="w-full rounded-t-lg bg-primary transition-all"
                      style={{ height: `${Math.max(4, (completedBars[i] / maxCompleted) * 100)}%` }}
                      title={`${completedBars[i]} on ${day}`}
                    />
                    <span className="text-[10px] text-muted-foreground">{new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  </div>
                ))}
              </div>
            </section>

            {hourBars.some((h) => h > 0) && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">Focused hours per day</h2>
                <div className="flex items-end gap-2 h-24">
                  {days.map((day, i) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-lg bg-amber-500/80"
                        style={{ height: `${Math.max(4, (hourBars[i] / maxHours) * 100)}%` }}
                        title={`${hourBars[i]}h on ${day}`}
                      />
                      <span className="text-[10px] text-muted-foreground">{hourBars[i] || ''}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {topTags.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Most used tags (open tasks)</h2>
                <div className="flex flex-wrap gap-2">
                  {topTags.map(([tag, count]) => (
                    <span key={tag} className="rounded-full bg-primary/10 text-primary dark:bg-primary/20 px-3 py-1 text-sm font-medium">
                      #{tag} · {count}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
