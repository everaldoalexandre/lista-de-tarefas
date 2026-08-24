'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flame, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

type Habit = {
  id: string;
  name: string;
  doneDates: string[];
  streak: number;
};

type Stats = {
  xp: number;
  level: number;
  levelProgress: number;
  achievements: { key: string; label: string; description: string; earned: boolean }[];
};

function dayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function HabitsPanel() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const last7 = Array.from({ length: 7 }, (_, i) => dayKey(i - 6));

  async function loadHabits() {
    try {
      const response = await fetch('/api/habits');
      if (response.ok) {
        const data: { habits: Habit[] } = await response.json();
        setHabits(data.habits);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHabits();
  }, []);

  async function createHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please fill in the habit name.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        setName('');
        await loadHabits();
        toast.success('Habit created!');
      } else {
        toast.error('Error creating habit.');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLog(habitId: string, date: string) {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              doneDates: h.doneDates.includes(date)
                ? h.doneDates.filter((d) => d !== date)
                : [...h.doneDates, date],
            }
          : h
      )
    );

    try {
      const response = await fetch('/api/habits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: habitId, date }),
      });
      if (!response.ok) throw new Error();
      await loadHabits();
    } catch {
      toast.error('Could not update the habit.');
      loadHabits();
    }
  }

  async function deleteHabit(habitId: string) {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));

    try {
      const response = await fetch('/api/habits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: habitId }),
      });
      if (!response.ok) throw new Error();
      toast.success('Habit deleted!');
    } catch {
      toast.error('Could not delete the habit.');
      loadHabits();
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link
            href="/app"
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Flame className="size-5 text-amber-500" />
            Habits
          </h1>
          <span className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Your progress</CardTitle>
              <CardDescription>Level {stats.level} · {stats.xp} XP</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="h-2 rounded-full bg-muted overflow-hidden" aria-label={`${stats.levelProgress}% to next level`}>
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.levelProgress}%` }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.achievements.map((achievement) => (
                  <span
                    key={achievement.key}
                    title={achievement.description}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${achievement.earned ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground opacity-60'}`}
                  >
                    {achievement.earned ? '🏆 ' : ''}{achievement.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>New habit</CardTitle>
            <CardDescription>Build a daily routine and keep the streak alive.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createHabit} className="flex gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Read 30 minutes"
                maxLength={60}
              />
              <Button type="submit" disabled={submitting} className="shrink-0">
                <Plus className="size-4" />
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <p className="text-center text-muted-foreground font-medium py-10">
            No habits yet. Create your first one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {habits.map((habit) => {
              const doneToday = habit.doneDates.includes(dayKey());
              return (
                <li key={habit.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                  <span className={`flex items-center gap-1 font-bold ${habit.streak > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    <Flame className="size-5" />
                    {habit.streak}
                  </span>
                  <span className="font-semibold text-foreground flex-1 min-w-[120px]">{habit.name}</span>

                  <div className="flex items-center gap-1.5">
                    {last7.map((date) => {
                      const done = habit.doneDates.includes(date);
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => toggleLog(habit.id, date)}
                          title={date}
                          aria-label={`${habit.name} on ${date}`}
                          className={`size-6 rounded-full transition-colors ${
                            done
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border bg-background hover:bg-accent'
                          }`}
                        >
                          {done && '✓'}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteHabit(habit.id)}
                    aria-label={`Delete ${habit.name}`}
                    title="Delete habit"
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-accent"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <span className="sr-only">{doneToday ? 'done today' : 'not done today'}</span>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
