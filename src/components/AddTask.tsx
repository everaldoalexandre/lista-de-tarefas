'use client';

import { useState, useEffect, useRef } from 'react';
import { DeleteIcon, EditIcon, CalendarIcon, CopyIcon } from './Lucide';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd'
import type { Task } from '@/type/type';
import { toast } from "sonner"

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function AddTask({ projectId, onTasksChanged }: { projectId: string; onTasksChanged: () => void }) {
  const [list, setList] = useState<Task[]>([]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [taskSelected, setTaskSelected] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [showModalDelete, setShowModalDelete] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [taskEdit, setTaskEdit] = useState<Task | null>(null);
  const [descriptionEdit, setDescriptionEdit] = useState('');
  const [dateEdit, setDateEdit] = useState('');

  function autoResize() {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 64)}px`;
  }

  useEffect(() => {
    toloadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function openModalEdit(task: Task) {
    setTaskEdit(task);
    setDescriptionEdit(task.description);
    setDateEdit(task.date ? toDateInputValue(task.date) : '');
    setShowModalEdit(true);
  }

  async function saveEdit(taskEdit: Task, description: string, date: string) {
    if (!description.trim()) {
      toast.error('Please fill in the task description.');
      return false;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskEdit.id,
          description,
          date: date ? new Date(`${date}T00:00:00`).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Error updating task');
      }

      toast.success('Task edited!');
      await toloadTask();
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error updating task. Please try again.');
      return false;
    }
  }

  async function handleOnDragEnd(result: DropResult) {
    if (!result.destination) return;

    const newList = Array.from(list);
    const [reordered] = newList.splice(result.source.index, 1);
    newList.splice(result.destination.index, 0, reordered);

    setList(newList);

    try {
      const order = [
        ...newList.map((task) => task.id),
        ...list.filter((t) => t.status === 'completed').map((t) => t.id),
      ];

      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });

      if (!response.ok) {
        throw new Error('Error saving new order');
      }
    } catch (error) {
      console.error('Error saving new order:', error);
      toast.error('Unable to save new order. Please reload the page.');
      toloadTask();
    }
  }

  function tomarkTask(task: Task) {
    const previousList = list;
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    setList(list.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Error updating status');
        onTasksChanged();
      })
      .catch(() => {
        toast.error('Error updating status');
        setList(previousList);
      });
  }

  function confirmedDelete(task: Task) {
    setTaskSelected(task);
    setShowModalDelete(true);
  }

  async function copyTask(description: string) {
    try {
      await navigator.clipboard.writeText(description);
      toast.success("Task copied!")
    } catch (error) {
      console.error('Error copying task:', error);
      toast.error('Unable to copy the task.');
    }
  }

  async function deleteConfirmedTask() {
    if (!taskSelected) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskSelected.id }),
      });

      if (response.ok) {
        toast.success("Task deleted!")
        setShowModalDelete(false);
        setTaskSelected(null);
        await toloadTask();
      } else {
        toast.error('Error deleting task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Connection error. Please try again.');
    }
  }

  async function toloadTask() {

    const response = await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`);

    if (response.ok) {
      const data: { list: { id: string, description: string; date: string | null; status: string; order: number; projectId: string | null; userId: string; }[] } = await response.json();

      const listConverted: Task[] = data.list.map((item) => ({
        ...item,
        date: item.date ? new Date(item.date) : null,
      }));

      setList(listConverted);
      onTasksChanged();
    } else {
      toast.error('Error loading tasks. Please reload the page.');
      console.error('Error loading tasks', response.statusText);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Please fill in the task description.")
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    try {
      const newTask = {
        description: description.trim(),
        date: date ? new Date(`${date}T00:00:00`).toISOString() : undefined,
        projectId,
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTask })
      });

      const result = await response.json();

      if (response.ok) {
        setDescription('');
        setDate('');
        setShowDateInput(false);
        if (descriptionRef.current) descriptionRef.current.style.height = 'auto';
        await toloadTask();
      } else {
        toast.error(result.error || 'Error adding task. Please try again.');
      }

    } catch (error) {
      console.error('Request error:', error);
      toast.error('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 min-h-[180px] w-full max-w-2xl">
      <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-2 bg-card border border-border shadow-sm p-3 rounded-2xl w-full">
        <textarea
          ref={descriptionRef}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            autoResize();
          }}
          placeholder="Enter a new task"
          rows={1}
          style={{ minHeight: '64px' }}
          className="p-2 rounded-lg w-full text-foreground placeholder:text-muted-foreground resize-none overflow-hidden bg-transparent outline-none"
        />
        <div className="flex gap-2 items-center sm:flex-none">
          <button
            type="button"
            onClick={() => setShowDateInput(!showDateInput)}
            className="bg-accent text-accent-foreground hover:bg-accent/80 p-2 rounded-xl shrink-0 transition-colors"
            title="Add date"
            aria-label="Add date"
          >
            <CalendarIcon />
          </button>
          {showDateInput && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="p-1 rounded-lg bg-accent text-foreground flex-1 sm:flex-none sm:w-40"
            />
          )}
          <button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl shrink-0 disabled:opacity-50 font-bold transition-colors" aria-label="Add task">
            +
          </button>
        </div>
      </form>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="tasks">
          {(provided) => (
            <ul
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex flex-col gap-2 w-full">
              {list.filter((t) => t.status === 'pending').map((newTask, id) => (
                <Draggable key={newTask.id} draggableId={String(newTask.id)} index={id}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`grid grid-cols-[30px_1fr_24px_24px_24px] sm:grid-cols-[40px_2fr_100px_30px_30px_30px] items-center gap-2 p-2 rounded-lg bg-card border border-border shadow-sm hover:shadow transition-shadow text-card-foreground`}>
                      <input type="checkbox" className="w-5 h-5 accent-foreground cursor-pointer" checked={false}
                        aria-label="Mark task as completed"
                        onChange={() => tomarkTask(newTask)} />
                      <span className="break-all">{newTask.description}</span>
                      <span className="hidden sm:block text-right">
                        {newTask.date ? newTask.date.toLocaleDateString('en-US') : ''}
                      </span>
                      <div className='sm:flex sm:justify-items-end flex sm:flex-row gap-1'>
                        <button
                          className='text-muted-foreground rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors'
                          onClick={() => openModalEdit(newTask)}
                          title="Edit task"
                          aria-label="Edit task"
                        >
                          <EditIcon />
                        </button>
                        <button
                          className='text-muted-foreground rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors'
                          onClick={() => copyTask(newTask.description)}
                          title="Copy task"
                          aria-label="Copy task"
                        >
                          <CopyIcon />
                        </button>
                        <button
                          className='text-muted-foreground rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors'
                          onClick={() => confirmedDelete(newTask)}
                          title="Delete task"
                          aria-label="Delete task"
                        >
                          {' '}<DeleteIcon />
                        </button>
                      </div>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>

      {list.filter((t) => t.status === 'completed').length > 0 && (
        <div className="w-full">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border shadow-sm text-foreground font-bold hover:bg-accent transition-colors"
          >
            <span>Completed ({list.filter((t) => t.status === 'completed').length})</span>
            <span>{showCompleted ? '−' : '+'}</span>
          </button>
          {showCompleted && (
            <ul className="flex flex-col gap-2 mt-2">
              {list.filter((t) => t.status === 'completed').map((newTask) => (
                <li
                  key={newTask.id}
                  className={`grid grid-cols-[30px_1fr_24px_24px_24px] sm:grid-cols-[40px_2fr_100px_30px_30px_30px] items-center gap-2 p-2 rounded-lg bg-muted text-muted-foreground line-through`}>
                  <input type="checkbox" className="w-5 h-5 accent-foreground cursor-pointer" checked={true}
                    aria-label="Mark task as pending"
                    onChange={() => tomarkTask(newTask)} />
                  <span className="break-all">{newTask.description}</span>
                  <span className="hidden sm:block text-right">
                    {newTask.date ? newTask.date.toLocaleDateString('en-US') : ''}
                  </span>
                  <div className='sm:flex sm:justify-items-end flex sm:flex-row gap-1'>
                    <button
                      className='rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors'
                      onClick={() => openModalEdit(newTask)}
                      title="Edit task"
                      aria-label="Edit task"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className='rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors'
                      onClick={() => copyTask(newTask.description)}
                      title="Copy task"
                      aria-label="Copy task"
                    >
                      <CopyIcon />
                    </button>
                    <button
                      className='rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors'
                      onClick={() => confirmedDelete(newTask)}
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      {' '}<DeleteIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {showModalDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg text-foreground font-bold mb-4">Confirm deletion</h2>
            <p className='text-muted-foreground'>Are you sure you want to delete the task?</p>

            <div className="mt-6 flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
                onClick={() => setShowModalDelete(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors"
                onClick={deleteConfirmedTask}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showModalEdit && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg text-foreground font-bold mb-4">Edit Task</h2>

            <input
              type="text"
              value={descriptionEdit}
              onChange={(e) => setDescriptionEdit(e.target.value)}
              placeholder="Description"
              className="w-full text-foreground p-2 rounded-lg mb-2 border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="date"
              value={dateEdit}
              onChange={(e) => setDateEdit(e.target.value)}
              className="w-full text-foreground p-2 rounded-lg mb-2 border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
                onClick={() => setShowModalEdit(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={async () => {
                  if (taskEdit) {
                    const saved = await saveEdit(taskEdit, descriptionEdit, dateEdit);
                    if (saved) {
                      setShowModalEdit(false);
                      setTaskEdit(null);
                    }
                  }
                }}
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
