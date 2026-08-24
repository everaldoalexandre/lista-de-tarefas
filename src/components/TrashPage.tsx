'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type DeletedTask = { id: string; description: string; deletedAt: string | null };
type DeletedProject = { id: string; name: string; deletedAt: string | null };
type DeletedNote = { id: string; title: string; deletedAt: string | null };

export default function TrashPage() {
  const [tasks, setTasks] = useState<DeletedTask[]>([]);
  const [projects, setProjects] = useState<DeletedProject[]>([]);
  const [notes, setNotes] = useState<DeletedNote[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTrash() {
    try {
      const [t, p, n] = await Promise.all([
        fetch('/api/tasks?trash=1'),
        fetch('/api/projects?trash=1'),
        fetch('/api/notes?trash=1'),
      ]);
      setTasks(t.ok ? (await t.json()).list ?? [] : []);
      setProjects(p.ok ? (await p.json()).projects ?? [] : []);
      setNotes(n.ok ? (await n.json()).notes ?? [] : []);
    } finally {
      setLoading(false);
    }
  }

   
  useEffect(() => { loadTrash(); }, []);

  async function call(url: string, method: string, body: object, done: string) {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      toast.success(done);
      await loadTrash();
    } else {
      toast.error('Action failed.');
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
          <h1 className="text-lg font-bold text-foreground">Trash</h1>
          <span className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Deleted projects</h2>
          {loading ? (
            <div className="h-14 rounded-xl bg-muted animate-pulse" />
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                  <span className="font-semibold text-foreground flex-1 truncate">{p.name}</span>
                  <button type="button" onClick={() => call('/api/projects', 'PUT', { id: p.id, restore: true }, 'Project restored!')}
                    className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium hover:bg-accent/80 transition-colors">
                    <RotateCcw className="size-4" /> Restore
                  </button>
                  <button type="button" onClick={() => call('/api/projects', 'DELETE', { id: p.id, purge: true }, 'Project permanently deleted')}
                    aria-label={`Delete ${p.name} forever`}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-accent transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Deleted tasks</h2>
          {loading ? (
            <div className="h-14 rounded-xl bg-muted animate-pulse" />
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                  <span className="text-foreground flex-1 truncate">{t.description}</span>
                  <button type="button" onClick={() => call('/api/tasks', 'PUT', { id: t.id, restore: true }, 'Task restored!')}
                    className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium hover:bg-accent/80 transition-colors">
                    <RotateCcw className="size-4" /> Restore
                  </button>
                  <button type="button" onClick={() => call('/api/tasks', 'DELETE', { id: t.id, purge: true }, 'Task permanently deleted')}
                    aria-label={`Delete task forever`}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-accent transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Deleted notes</h2>
          {loading ? (
            <div className="h-14 rounded-xl bg-muted animate-pulse" />
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes.map((n) => (
                <li key={n.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                  <span className="text-foreground flex-1 truncate">{n.title}</span>
                  <button type="button" onClick={() => call('/api/notes', 'PUT', { id: n.id, restore: true }, 'Note restored!')}
                    className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium hover:bg-accent/80 transition-colors">
                    <RotateCcw className="size-4" /> Restore
                  </button>
                  <button type="button" onClick={() => call('/api/notes', 'DELETE', { id: n.id, purge: true }, 'Note permanently deleted')}
                    aria-label={`Delete ${n.title} forever`}
                    className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-accent transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
