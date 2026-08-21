'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Monitor,
  Moon,
  Repeat,
  Share2,
  Sun,
  Tags,
  UserRound,
  Download,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const ideas = [
  { icon: UserRound, title: 'Profile editing', description: 'Change your name and add an avatar.' },
  { icon: Repeat, title: 'Recurring tasks', description: 'Tasks that automatically renew daily, weekly or monthly.' },
  { icon: Tags, title: 'Tags and filters', description: 'Label tasks and filter your list by tag, date or status.' },
  { icon: Bell, title: 'Reminders', description: 'Email or push notifications when a task is due.' },
  { icon: CalendarDays, title: 'Calendar view', description: 'See your tasks for the week or month in a calendar layout.' },
  { icon: Download, title: 'Data export', description: 'Download your projects and tasks as CSV or JSON.' },
  { icon: Share2, title: 'Shared projects', description: 'Invite other people to collaborate on a project.' },
];

export default function SettingsContent() {
  const { theme, setTheme } = useTheme();

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
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
          <span className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose how the app looks on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={theme === option.value}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition-colors',
                      theme === option.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <option.icon className="size-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <ChangePasswordForm />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              Ideas to improve the project
            </CardTitle>
            <CardDescription>
              Features we can add next — tell me which ones you want to prioritize.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ideas.map((idea) => (
                <li
                  key={idea.title}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <idea.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{idea.title}</span>
                    <span className="block text-xs text-muted-foreground">{idea.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
