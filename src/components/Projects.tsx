'use client';

import { useState } from 'react';
import { CalendarDays, CalendarRange } from 'lucide-react';
import { toast } from "sonner";
import { PlusIcon } from './Lucide';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Project } from '@/type/type';

export default function Projects({ projects, reloadProjects, loading, smartList, onSelectSmart, selectedProjectId, onSelectProject, collapsed }: { projects: Project[]; reloadProjects: () => Promise<void>; loading?: boolean; smartList: 'today' | 'week' | null; onSelectSmart: (key: 'today' | 'week') => void; selectedProjectId: string | null; onSelectProject: (project: Project | null) => void; collapsed?: boolean }) {
  const [name, setName] = useState('');
  const [showModalAdd, setShowModalAdd] = useState(false);

  async function createProject() {
    if (!name.trim()) {
      toast.error("Please fill in the project name.");
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Project created!")
        setName('');
        setShowModalAdd(false);
        await reloadProjects();
        onSelectProject(result.project);
      } else {
        toast.error(result.error || 'Error creating project.');
      }
    } catch (error) {
      console.error('Request error:', error);
      toast.error('Connection error. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="h-11 rounded-xl bg-muted animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  async function togglePin(project: Project) {
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, pinned: !project.pinned }),
      });
      if (!response.ok) throw new Error('failed');
      await reloadProjects();
    } catch {
      toast.error('Could not update the project.');
    }
  }

  const sortedProjects = [...projects].sort(
    (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false)
  );

  const smartItems = [
    { key: 'today' as const, label: 'Today', icon: CalendarDays },
    { key: 'week' as const, label: 'Next 7 days', icon: CalendarRange },
  ];

  return (
    <div className={`flex flex-col gap-4 h-full ${collapsed ? 'p-3' : 'p-4'}`}>
      <button
        type="button"
        onClick={() => setShowModalAdd(true)}
        className={collapsed
          ? 'flex items-center justify-center w-12 h-12 mx-auto bg-primary text-primary-foreground rounded-xl font-semibold shadow-sm hover:bg-primary/90 transition-colors'
          : 'flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-semibold shadow-sm hover:bg-primary/90 transition-colors'}
      >
        <PlusIcon />
        {!collapsed && 'Add project'}
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-1">
          {smartItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectSmart(item.key)}
              className={`w-full text-left px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 ${smartList === item.key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              <item.icon />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {!collapsed && (
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-1">Projects</p>
      )}

      {projects.length === 0 && !collapsed && (
        <p className="text-muted-foreground font-medium text-center text-sm">No projects yet.</p>
      )}

      <ul className={`flex gap-2 overflow-y-auto ${collapsed ? 'flex-col items-center' : 'flex-col'}`}>
        {sortedProjects.map((project) => (
          <li key={project.id} className={collapsed ? 'flex' : 'group relative'}>
            <button
              type="button"
              onClick={() => onSelectProject(project)}
              title={project.name}
              className={collapsed
                ? 'flex items-center justify-center w-12 h-12 rounded-full font-bold bg-background border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
                : `w-full text-left px-4 py-2.5 rounded-xl font-semibold transition-colors ${selectedProjectId === project.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              {collapsed ? project.name.charAt(0).toUpperCase() : (
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{project.pinned && '★ '}{project.name}</span>
                  <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${selectedProjectId === project.id ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                    {project.pendingCount ?? 0}
                  </span>
                </span>
              )}
            </button>
            {!collapsed && (
              <button
                type="button"
                onClick={() => togglePin(project)}
                title={project.pinned ? 'Unpin project' : 'Pin project'}
                aria-label={project.pinned ? 'Unpin project' : 'Pin project'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-sm transition-opacity ${project.pinned ? 'text-amber-500 opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-500'}`}
              >
                ★
              </button>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={showModalAdd} onOpenChange={setShowModalAdd}>
        <DialogContent className="max-w-md">
          <h2 className="text-lg text-foreground font-bold mb-4">Add project</h2>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            onKeyDown={(e) => e.key === 'Enter' && createProject()}
            className="w-full text-foreground p-2 rounded-lg mb-4 border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
              onClick={() => {
                setShowModalAdd(false);
                setName('');
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={createProject}
            >
              Create
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
