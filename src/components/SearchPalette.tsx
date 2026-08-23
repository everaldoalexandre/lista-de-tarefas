'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { Project } from '@/type/type';

type SearchableTask = {
  id: string;
  description: string;
  status: string;
  projectId: string | null;
  project?: { id: string; name: string } | null;
};

export default function SearchPalette({
  projects,
  open,
  onOpenChange,
}: {
  projects: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<SearchableTask[]>([]);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao abrir
    setQuery('');
    fetch('/api/tasks?all=1')
      .then((r) => (r.ok ? r.json() : { list: [] }))
      .then((data: { list: SearchableTask[] }) => setTasks(data.list))
      .catch(() => setTasks([]));
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taskHits = q
      ? tasks.filter((t) => t.description.toLowerCase().includes(q)).slice(0, 8)
      : [];
    const projectHits = q
      ? projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 4)
      : projects.slice(0, 4);
    return { taskHits, projectHits };
  }, [query, tasks, projects]);

  function goProject(id: string | null) {
    onOpenChange(false);
    router.push('/app');
    window.setTimeout(
      () => window.dispatchEvent(new CustomEvent('open-project', { detail: { id } })),
      50
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 gap-2 p-0" showClose={false}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks and projects..."
            className="w-full bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:block rounded border border-border bg-muted px-1.5 text-xs text-muted-foreground">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {!query && (
            <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Projects</p>
          )}
          {results.projectHits.map((p) => (
            <button
              key={`p-${p.id}`}
              type="button"
              onClick={() => goProject(p.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
            >
              <span className="truncate">{p.name}</span>
              <CornerDownLeft className="size-3 text-muted-foreground" />
            </button>
          ))}
          {results.taskHits.length > 0 && (
            <p className="mt-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tasks</p>
          )}
          {results.taskHits.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goProject(t.projectId)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
            >
              <span className="truncate">{t.description}</span>
              {t.project && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {t.project.name}
                </span>
              )}
            </button>
          ))}
          {query && results.taskHits.length === 0 && results.projectHits.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
