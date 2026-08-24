'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckSquare,
  Folder,
  Pencil,
  Pin,
  PinOff,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Note, Project, Task } from '@/type/type';

const inputClass =
  'w-full text-foreground p-2 rounded-lg border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground';

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editProjectId, setEditProjectId] = useState<string>('');
  const [editTaskId, setEditTaskId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  async function loadNotes() {
    try {
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data: { notes: Note[] } = await response.json();
        setNotes(data.notes);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadLinkOptions() {
    try {
      const [p, t] = await Promise.all([
        fetch('/api/projects').then((r) => (r.ok ? r.json() : { projects: [] })),
        fetch('/api/tasks?all=1').then((r) => (r.ok ? r.json() : { list: [] })),
      ]);
      setProjects(p.projects ?? []);
      setTasks(t.list ?? []);
    } catch {
      setProjects([]);
      setTasks([]);
    }
  }

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please fill in the note title.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });

      if (response.ok) {
        setTitle('');
        setContent('');
        await loadNotes();
        toast.success('Note created!');
      } else {
        const result = await response.json().catch(() => null);
        toast.error(result?.error || 'Error creating note.');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePin(note: Note) {
    const previous = notes;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned: !note.pinned } : n))
    );

    try {
      const response = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id, pinned: !note.pinned }),
      });
      if (!response.ok) throw new Error();
    } catch {
      toast.error('Could not update the note.');
      setNotes(previous);
    }
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content ?? '');
    setEditProjectId(note.projectId ?? '');
    setEditTaskId(note.taskId ?? '');
    loadLinkOptions();
  }

  function closeEdit() {
    setEditingNote(null);
  }

  async function saveEdit() {
    if (!editingNote) return;

    if (!editTitle.trim()) {
      toast.error('Please fill in the note title.');
      return;
    }

    try {
      const response = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNote.id,
          title: editTitle.trim(),
          content: editContent.trim(),
          projectId: editProjectId || null,
          taskId: editTaskId || null,
        }),
      });

      const result = await response.json().catch(() => null);

      if (response.ok) {
        toast.success('Note updated!');
        closeEdit();
        await loadNotes();
      } else {
        toast.error(result?.error || 'Error updating note.');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    }
  }

  function deleteNote(noteId: string) {
    const previous = notes;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        toast.success('Note moved to trash!', {
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await fetch('/api/notes', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: noteId, restore: true }),
                });
              } finally {
                loadNotes();
              }
            },
          },
        });
      })
      .catch(() => {
        toast.error('Could not delete the note.');
        setNotes(previous);
      });
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
            <StickyNote className="size-5 text-amber-500" />
            Notes
          </h1>
          <span className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
        <form
          onSubmit={createNote}
          className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            maxLength={120}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note... (optional)"
            rows={3}
            maxLength={10000}
            className={`${inputClass} resize-y`}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              <Plus className="size-4" />
              Add note
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-center text-muted-foreground font-medium py-10">
            No notes yet. Create your first one above.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 shadow-sm transition-colors ${
                  note.pinned
                    ? 'border-primary/50 bg-accent/40'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start gap-1">
                  <h2 className="font-semibold text-foreground flex-1 break-words min-w-0">
                    {note.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => togglePin(note)}
                    aria-label={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
                    title={note.pinned ? 'Unpin note' : 'Pin note'}
                    className={`transition-colors p-1 rounded-md hover:bg-accent ${
                      note.pinned ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {note.pinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(note)}
                    aria-label={`Edit ${note.title}`}
                    title="Edit note"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    aria-label={`Delete ${note.title}`}
                    title="Delete note"
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-accent"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {note.content && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6 break-words">
                    {note.content}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {note.project && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground max-w-full">
                      <Folder className="size-3 shrink-0" />
                      <span className="truncate">{note.project.name}</span>
                    </span>
                  )}
                  {note.task && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground max-w-full">
                      <CheckSquare className="size-3 shrink-0" />
                      <span className="truncate">{note.task.description}</span>
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog open={!!editingNote} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg text-foreground font-bold">Edit note</h2>

            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Note title"
              maxLength={120}
              className={inputClass}
            />

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write your note... (optional)"
              rows={5}
              maxLength={10000}
              className={`${inputClass} resize-y`}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                Project
                <select
                  value={editProjectId}
                  onChange={(e) => setEditProjectId(e.target.value)}
                  className="rounded-lg border border-border bg-background text-sm font-normal text-foreground px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
                Task
                <select
                  value={editTaskId}
                  onChange={(e) => setEditTaskId(e.target.value)}
                  className="rounded-lg border border-border bg-background text-sm font-normal text-foreground px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">No task</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.description.length > 40
                        ? `${task.description.slice(0, 40)}…`
                        : task.description}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
                onClick={closeEdit}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={saveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
