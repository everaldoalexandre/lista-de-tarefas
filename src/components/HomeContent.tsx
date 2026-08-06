'use client';

import { useState } from 'react';
import Logout from './Logout';
import CurrentDate from './CurrentData';
import Projects from './Projects';
import AddTask from './AddTask';
import { MenuIcon, ChevronLeftIcon, ChevronRightIcon, DeleteIcon } from './Lucide';

type Project = { id: string; name: string; userId: string; createdAt: string; pendingCount?: number };

export default function HomeContent() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  function handleSelectProject(project: Project | null) {
    setSelectedProject(project);
    setMobileSidebarOpen(false);
  }

  return (
    <div className="font-sans bg-gray-100 min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          className="text-gray-500"
          onClick={() => setMobileSidebarOpen(true)}
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
          >
            {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>
        <Projects
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
              >
                <DeleteIcon />
              </button>
            </div>
            <Projects
              selectedProjectId={selectedProject?.id ?? null}
              onSelectProject={handleSelectProject}
            />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center p-4 md:p-8 pb-20">
        <nav className="hidden md:flex w-full items-center justify-between">
          <CurrentDate />
          <Logout />
        </nav>
        {selectedProject ? (
          <div className="w-full flex flex-col items-center pt-6 md:pt-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-500 text-center mb-4">{selectedProject.name}</h2>
            <AddTask projectId={selectedProject.id} />
          </div>
        ) : (
          <p className="text-gray-400 font-bold pt-10">Select a project to see and manage its tasks.</p>
        )}
      </main>
    </div>
  );
}
