'use client';

import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { DeleteIcon, EditIcon, PlusIcon } from './Lucide';

type Project = { id: string; name: string; userId: string; createdAt: string; pendingCount?: number };

export default function Projects({ selectedProjectId, onSelectProject, collapsed }: { selectedProjectId: string | null; onSelectProject: (project: Project | null) => void; collapsed?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [showModalAdd, setShowModalAdd] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [nameEdit, setNameEdit] = useState('');

  useEffect(() => {
    loadProjects();
    window.addEventListener('tasks-changed', loadProjects);
    return () => window.removeEventListener('tasks-changed', loadProjects);
  }, []);

  async function loadProjects() {
    const response = await fetch('/api/projects');

    if (response.ok) {
      const data: { projects: Project[] } = await response.json();
      setProjects(data.projects);
    } else {
      console.error('Error loading projects', response.statusText);
    }
  }

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
        await loadProjects();
        onSelectProject(result.project);
      } else {
        toast.error(result.error || 'Error creating project.');
      }
    } catch (error) {
      console.error('Request error:', error);
      toast.error('Connection error. Please try again.');
    }
  }

  function confirmDelete(project: Project) {
    setProjectToDelete(project);
    setShowModalDelete(true);
  }

  async function deleteProject() {
    if (!projectToDelete) return;

    const response = await fetch('/api/projects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectToDelete.id }),
    });

    if (response.ok) {
      toast.success("Project deleted!")
      setShowModalDelete(false);
      setProjectToDelete(null);
      if (selectedProjectId === projectToDelete.id) onSelectProject(null);
      await loadProjects();
    } else {
      toast.error('Error deleting project');
    }
  }

  function openModalEdit(project: Project) {
    setProjectToEdit(project);
    setNameEdit(project.name);
    setShowModalEdit(true);
  }

  async function saveEdit() {
    if (!projectToEdit) return;

    if (!nameEdit.trim()) {
      toast.error("Please fill in the project name.");
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectToEdit.id, name: nameEdit.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Project updated!")
        setShowModalEdit(false);
        setProjectToEdit(null);
        if (selectedProjectId === projectToEdit.id) onSelectProject(result.project);
        await loadProjects();
      } else {
        toast.error(result.error || 'Error updating project.');
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
          ? 'flex items-center justify-center w-12 h-12 mx-auto bg-gray-800 text-white rounded-2xl font-bold hover:bg-gray-950'
          : 'flex items-center justify-center gap-2 bg-gray-800 text-white px-4 py-3 rounded-2xl font-bold hover:bg-gray-950'}
      >
        <PlusIcon />
        {!collapsed && 'Add project'}
      </button>

      {projects.length === 0 && !collapsed && (
        <p className="text-gray-400 font-bold text-center">No projects yet.</p>
      )}

      <ul className={`flex gap-2 overflow-y-auto ${collapsed ? 'flex-col items-center' : 'flex-col'}`}>
        {projects.map((project) => (
          <li key={project.id} className={`flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
            <button
              type="button"
              onClick={() => onSelectProject(project)}
              className={collapsed
                ? 'flex items-center justify-center w-12 h-12 rounded-full font-bold bg-white text-gray-500 hover:bg-gray-200'
                : `flex-1 text-left px-4 py-2 rounded-xl font-bold ${selectedProjectId === project.id ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-200'}`}
            >
              {collapsed ? project.name.charAt(0).toUpperCase() : `${project.name} (${project.pendingCount ?? 0})`}
            </button>
            {!collapsed && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => openModalEdit(project)}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => confirmDelete(project)}
                >
                  <DeleteIcon />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {showModalAdd && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-40 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Add project</h2>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="w-full text-gray-500 p-2 rounded mb-4 border border-gray-300"
            />

            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded font-bold text-gray-500 bg-gray-300 hover:bg-gray-400"
                onClick={() => {
                  setShowModalAdd(false);
                  setName('');
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded font-bold bg-gray-800 text-white hover:bg-gray-950"
                onClick={createProject}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-40 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Confirm deletion</h2>
            <p className="text-gray-500">Are you sure you want to delete the project {projectToDelete?.name}? Its tasks will also be deleted.</p>

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
                onClick={() => {
                  setShowModalEdit(false);
                  setProjectToEdit(null);
                }}
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
    </div>
  );
}
