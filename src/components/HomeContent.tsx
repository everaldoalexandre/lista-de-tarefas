'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Logout from './Logout';
import CurrentDate from './CurrentData';
import Projects from './Projects';
import AddTask from './AddTask';
import { ThemeToggle } from './ThemeToggle';
import { MenuIcon, ChevronLeftIcon, ChevronRightIcon, DeleteIcon, EditIcon, SettingsIcon } from './Lucide';
import type { Project } from '@/type/type';
import { toast } from "sonner";

export default function HomeContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [nameEdit, setNameEdit] = useState('');
  const [showModalDelete, setShowModalDelete] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');

      if (response.ok) {
        const data: { projects: Project[] } = await response.json();
        setProjects(data.projects);
      } else {
        console.error('Error loading projects', response.statusText);
      }
    } catch (error) {
      console.error('Request error:', error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de dados no mount
    loadProjects();
  }, [loadProjects]);

  function handleSelectProject(project: Project | null) {
    setSelectedProject(project);
    setMobileSidebarOpen(false);
  }

  function openModalEdit() {
    if (!selectedProject) return;
    setNameEdit(selectedProject.name);
    setShowModalEdit(true);
  }

  async function saveEdit() {
    if (!selectedProject) return;

    if (!nameEdit.trim()) {
      toast.error("Please fill in the project name.");
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedProject.id, name: nameEdit.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Project updated!")
        setSelectedProject(result.project);
        setShowModalEdit(false);
        await loadProjects();
      } else {
        toast.error(result.error || 'Error updating project.');
      }
    } catch (error) {
      console.error('Request error:', error);
      toast.error('Connection error. Please try again.');
    }
  }

  async function deleteProject() {
    if (!selectedProject) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedProject.id }),
      });

      if (response.ok) {
        toast.success("Project deleted!")
        setShowModalDelete(false);
        setSelectedProject(null);
        await loadProjects();
      } else {
        toast.error('Error deleting project');
      }
    } catch (error) {
      console.error('Request error:', error);
      toast.error('Connection error. Please try again.');
    }
  }

  return (
    <div className="font-sans bg-background min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <CurrentDate />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Logout />
        </div>
      </header>

      <aside className={`hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-72'}`}>
        <div className={`flex items-center justify-end p-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>
        <Projects
          projects={projects}
          reloadProjects={loadProjects}
          selectedProjectId={selectedProject?.id ?? null}
          onSelectProject={handleSelectProject}
          collapsed={sidebarCollapsed}
        />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-card shadow-lg">
            <div className="flex items-center justify-end p-2">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close menu"
              >
                <DeleteIcon />
              </button>
            </div>
            <Projects
              projects={projects}
              reloadProjects={loadProjects}
              selectedProjectId={selectedProject?.id ?? null}
              onSelectProject={handleSelectProject}
            />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center p-4 md:p-8 pb-20">
        <nav className="hidden md:flex w-full items-center justify-between">
          <CurrentDate />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <SettingsIcon />
            </Link>
            <Logout />
          </div>
        </nav>
        {selectedProject ? (
          <div className="w-full flex flex-col items-center pt-6 md:pt-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">{selectedProject.name}</h2>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
                onClick={openModalEdit}
                title="Edit project name"
                aria-label="Edit project name"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
                onClick={() => setShowModalDelete(true)}
                title="Delete project"
                aria-label="Delete project"
              >
                <DeleteIcon />
              </button>
            </div>
            <AddTask projectId={selectedProject.id} onTasksChanged={loadProjects} />
          </div>
        ) : (
          <p className="text-muted-foreground font-bold pt-10">Select a project to see and manage its tasks.</p>
        )}
      </main>

      {showModalEdit && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg text-foreground font-bold mb-4">Edit project</h2>

            <input
              type="text"
              value={nameEdit}
              onChange={(e) => setNameEdit(e.target.value)}
              placeholder="Project name"
              className="w-full text-foreground p-2 rounded-lg mb-4 border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
                onClick={() => setShowModalEdit(false)}
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
        </div>
      )}

      {showModalDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg text-foreground font-bold mb-4">Confirm deletion</h2>
            <p className="text-muted-foreground">Are you sure you want to delete the project {selectedProject?.name}? Its tasks will also be deleted.</p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
                onClick={() => setShowModalDelete(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors"
                onClick={deleteProject}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
