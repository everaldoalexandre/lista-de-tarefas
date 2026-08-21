'use client';

import { useState } from 'react';
import { toast } from "sonner";
import { PlusIcon } from './Lucide';
import type { Project } from '@/type/type';

export default function Projects({ projects, reloadProjects, selectedProjectId, onSelectProject, collapsed }: { projects: Project[]; reloadProjects: () => Promise<void>; selectedProjectId: string | null; onSelectProject: (project: Project | null) => void; collapsed?: boolean }) {
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

      {projects.length === 0 && !collapsed && (
        <p className="text-muted-foreground font-medium text-center text-sm">No projects yet.</p>
      )}

      <ul className={`flex gap-2 overflow-y-auto ${collapsed ? 'flex-col items-center' : 'flex-col'}`}>
        {projects.map((project) => (
          <li key={project.id} className={collapsed ? 'flex' : ''}>
            <button
              type="button"
              onClick={() => onSelectProject(project)}
              className={collapsed
                ? 'flex items-center justify-center w-12 h-12 rounded-full font-bold bg-background border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
                : `w-full text-left px-4 py-2.5 rounded-xl font-semibold transition-colors ${selectedProjectId === project.id ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            >
              {collapsed ? project.name.charAt(0).toUpperCase() : (
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{project.name}</span>
                  <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${selectedProjectId === project.id ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                    {project.pendingCount ?? 0}
                  </span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {showModalAdd && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg text-foreground font-bold mb-4">Add project</h2>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
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
          </div>
        </div>
      )}
    </div>
  );
}
