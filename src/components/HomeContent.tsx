'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Logout from './Logout';
import CurrentDate from './CurrentData';
import Projects from './Projects';
import AddTask from './AddTask';
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
    <div className="font-sans bg-gray-100 min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          className="text-gray-500"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <CurrentDate />
        <Logout />
      </header>

      <aside className={`hidden md:flex flex-col bg-gray-50 border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-72'}`}>
        <div className={`flex items-center justify-end p-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 p-1"
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
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-gray-50 shadow-lg">
            <div className="flex items-center justify-end p-2">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 p-1"
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
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="text-gray-400 hover:text-gray-600 p-2 rounded hover:bg-gray-200"
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
              <h2 className="text-xl md:text-2xl font-bold text-gray-500 text-center">{selectedProject.name}</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={openModalEdit}
                title="Edit project name"
                aria-label="Edit project name"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
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
          <p className="text-gray-400 font-bold pt-10">Select a project to see and manage its tasks.</p>
        )}
      </main>

      {showModalEdit && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Edit project</h2>

            <input
              type="text"
              value={nameEdit}
              onChange={(e) => setNameEdit(e.target.value)}
              placeholder="Project name"
              className="w-full text-gray-500 p-2 rounded mb-4 border border-gray-300"
            />

            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded font-bold text-gray-500 bg-gray-300 hover:bg-gray-400"
                onClick={() => setShowModalEdit(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded font-bold bg-gray-800 text-white hover:bg-gray-950"
                onClick={saveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-40 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Confirm deletion</h2>
            <p className="text-gray-500">Are you sure you want to delete the project {selectedProject?.name}? Its tasks will also be deleted.</p>

            <div className="mt-6 flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded font-bold text-gray-500 bg-gray-300 hover:bg-gray-400"
                onClick={() => setShowModalDelete(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded font-bold bg-gray-800 text-white hover:bg-gray-950"
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
