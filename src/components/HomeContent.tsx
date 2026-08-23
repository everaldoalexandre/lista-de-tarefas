'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import Logout from './Logout';
import CurrentDate from './CurrentData';
import Projects from './Projects';
import AddTask from './AddTask';
import TimerCard from './TimerCard';
import SearchPalette from './SearchPalette';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ThemeToggle } from './ThemeToggle';
import { MenuIcon, ChevronLeftIcon, ChevronRightIcon, DeleteIcon, EditIcon, SettingsIcon, SearchIcon, FlameIcon } from './Lucide';
import type { Project } from '@/type/type';
import { toast } from "sonner";

export type Selection =
  | { kind: 'project'; project: Project }
  | { kind: 'smart'; key: 'today' | 'week' }
  | null;

const smartLabels = { today: 'Today', week: 'Next 7 days' };

export default function HomeContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [smartList, setSmartList] = useState<'today' | 'week' | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [nameEdit, setNameEdit] = useState('');
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

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
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de dados no mount
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    function onOpenProject(e: Event) {
      const id = (e as CustomEvent<{ id: string | null }>).detail?.id;
      if (!id) return;
      setSmartList(null);
      setSelectedProject(projects.find((p) => p.id === id) ?? null);
    }
    window.addEventListener('open-project', onOpenProject);
    return () => window.removeEventListener('open-project', onOpenProject);
  }, [projects]);

  function selectProject(project: Project | null) {
    setSelectedProject(project);
    setSmartList(null);
    setMobileSidebarOpen(false);
  }

  function selectSmart(key: 'today' | 'week') {
    setSelectedProject(null);
    setSmartList(key);
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

  const tasksQuery = smartList ? `range=${smartList}` : selectedProject ? `projectId=${encodeURIComponent(selectedProject.id)}` : '';

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
          <Link
            href="/habits"
            className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
            title="Habits"
            aria-label="Habits"
          >
            <FlameIcon />
          </Link>
          <ThemeToggle />
          <Logout />
        </div>
      </header>

      <aside className={`hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-72'}`}>
        <div className={`flex items-center justify-end p-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
            onClick={() => setPaletteOpen(true)}
            title="Search (Ctrl+K)"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
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
          loading={loadingProjects}
          smartList={smartList}
          onSelectSmart={selectSmart}
          selectedProjectId={selectedProject?.id ?? null}
          onSelectProject={selectProject}
          collapsed={sidebarCollapsed}
        />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-card shadow-lg flex flex-col">
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
              loading={loadingProjects}
              smartList={smartList}
              onSelectSmart={selectSmart}
              selectedProjectId={selectedProject?.id ?? null}
              onSelectProject={selectProject}
            />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center p-4 md:p-8 pb-20">
        <nav className="hidden md:flex w-full items-center justify-between">
          <CurrentDate />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-sm"
              title="Search (Ctrl+K)"
            >
              <SearchIcon />
              <kbd className="hidden lg:block rounded border border-border bg-muted px-1.5 text-xs">Ctrl K</kbd>
            </button>
            <Link
              href="/habits"
              className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
              title="Habits"
              aria-label="Habits"
            >
              <FlameIcon />
            </Link>
            <Link
              href="/trash"
              className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
              title="Trash"
              aria-label="Trash"
            >
              <Trash2 className="size-5" />
            </Link>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <SettingsIcon />
            </Link>
            <ThemeToggle />
            <Logout />
          </div>
        </nav>

        {(selectedProject || smartList) && (
          <div className="w-full max-w-2xl flex items-start pt-6 md:pt-10 flex-col gap-2">
            {selectedProject ? (
              <>
                <div className="w-full flex items-center justify-between gap-2">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">{selectedProject.name}</h2>
                  <div className="flex items-center gap-1">
                    <div className="flex rounded-lg border border-border overflow-hidden mr-1">
                      {(['list', 'board'] as const).map((mode) => (
                        <button key={mode} type="button"
                          onClick={() => setViewMode(mode)}
                          className={`px-3 py-1 text-xs font-semibold capitalize transition-colors ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
                          {mode}
                        </button>
                      ))}
                    </div>
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
                </div>
                <ProgressBar projectId={selectedProject.id} key={selectedProject.id} />
                <TimerCard projectId={selectedProject.id} key={'t' + selectedProject.id} />
                <WeeklySummary />
              </>
            ) : (
              <h2 className="text-xl md:text-2xl font-bold text-foreground">{smartLabels[smartList!]}</h2>
            )}
          </div>
        )}

        {(selectedProject || smartList) && (
          <AddTask
            key={tasksQuery}
            query={tasksQuery}
            projectId={smartList ? undefined : selectedProject?.id}
            readOnly={!!smartList}
            view={viewMode}
            onTasksChanged={loadProjects}
          />
        )}

        {!selectedProject && !smartList && (
          <p className="text-muted-foreground font-bold pt-10">Select a project to see and manage its tasks.</p>
        )}
      </main>

      <SearchPalette projects={projects} open={paletteOpen} onOpenChange={setPaletteOpen} />

      <Dialog open={showModalEdit} onOpenChange={setShowModalEdit}>
        <DialogContent className="max-w-md">
          <div>
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
        </DialogContent>
      </Dialog>

      <Dialog open={showModalDelete} onOpenChange={setShowModalDelete}>
        <DialogContent className="max-w-md">
          <h2 className="text-lg text-foreground font-bold mb-2">Confirm deletion</h2>
          <p className="text-muted-foreground">Are you sure you want to delete the project {selectedProject?.name}? Its tasks will also be deleted.</p>
          <div className="mt-2 flex justify-end gap-3">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WeeklySummary() {
  const [weekTotal, setWeekTotal] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/timer');
        if (r.ok) setWeekTotal((await r.json()).weekTotal ?? 0);
      } catch {
        setWeekTotal(null);
      }
    }
    load();
    window.addEventListener('time-logged', load);
    return () => window.removeEventListener('time-logged', load);
  }, []);

  if (weekTotal === null || weekTotal === 0) return null;

  const h = Math.floor(weekTotal / 60);
  const m = weekTotal % 60;

  return (
    <p className="text-xs font-semibold text-muted-foreground">
      Focused this week: {h > 0 ? `${h}h ` : ''}{m}min
    </p>
  );
}

function ProgressBar({ projectId }: { projectId: string }) {
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : { list: [] }))
      .then((data: { list: { status: string }[] }) => {
        const total = data.list.length;
        const done = data.list.filter((t) => t.status === 'completed').length;
        setProgress(total === 0 ? null : Math.round((done / total) * 100));
      })
      .catch(() => setProgress(null));
  }, [projectId]);

  if (progress === null) return null;

  return (
    <div className="w-full flex items-center gap-2" aria-label={`${progress}% completed`}>
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{progress}%</span>
    </div>
  );
}
