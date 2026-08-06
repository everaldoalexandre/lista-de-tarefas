'use client';

import { useState, useEffect, useRef } from 'react';
import { DeleteIcon, EditIcon, CalendarIcon, CopyIcon } from './Lucide';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd'
import { useSession } from "@/lib/auth-client"
import { toast } from "sonner"

type Task = { id: string, description: string; date: Date | null; status: string; order: number; projectId: string | null; userId: string };

export default function AddTask({ projectId }: { projectId: string }) {
  const [list, setList] = useState<Task[]>([]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [taskSelected, setTaskSelected] = useState<Task | null>(null);
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
    el.style.height = `${Math.max(el.scrollHeight, 56)}px`;
  }

  useEffect(() => {
    toloadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function openModalEdit(task: Task) {
    setTaskEdit(task);
    setDescriptionEdit(task.description);
    setDateEdit(task.date ? task.date.toISOString().slice(0, 10) : '');
    setShowModalEdit(true);
  }

  async function saveEdit(taskEdit: Task, description: string, date: string) {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskEdit.id,
          description,
          date: date ? new Date(date + 'T00:00:00-03:00').toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Error updating task');
      }

      toast.success("Task edit!")
      toloadTask();
    } catch (error) {
      alert(error);
    }
  }

  async function handleOnDragEnd(result: DropResult) {
    if (!result.destination) return;

    const newList = Array.from(list);
    const [reordered] = newList.splice(result.source.index, 1);
    newList.splice(result.destination.index, 0, reordered);

    setList(newList);

    try {
      const order = newList.map(task => task.id);

      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),

      });
    } catch (error) {
      console.error('Error saving new order:', error);
      toast.error('Unable to save new order. Please reload the page.');
      toloadTask();
    }
  }

  function tomarkTask(task: Task) {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    const newList = list.map((t) => t.id === task.id ? { ...t, status: newStatus } : t);
    setList(newList);

    fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus }),
    }).catch(() => {
      toast.error('Error updating status');
      setList(list);
    });

    toloadTask();
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

    const response = await fetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskSelected.id }),
    });
    toast.success("Task deleted!")

    if (response.ok) {
      setShowModalDelete(false);
      setTaskSelected(null);
      toloadTask();
    } else {
      toast.error('Error deleting task');
    }
  }

  async function toloadTask() {

    const response = await fetch(`/api/tasks?projectId=${projectId}`);

    if (response.ok) {
      const data: { list: { id: string, description: string; date: string | null; status: string; order: number; projectId: string | null; userId: string; }[] } = await response.json();

      const listConverted: Task[] = data.list.map((item) => ({
        ...item,
        date: item.date ? new Date(item.date) : null,
      }));

      setList(listConverted);
      window.dispatchEvent(new Event('tasks-changed'));
    } else {
      console.error('Error loading tasks', response.statusText);
    }
  }

  const { data: session, isPending } = useSession()

  async function addTask(e: React.FormEvent) {
    e.preventDefault();

    if (isPending) {
      toast.success('Checking authentication...');
      return;
    }

    if (!session?.user?.id) {
      toast.error('Unauthenticated user. Please log in.');
      return;
    }

    if (!description.trim()) {
      toast.error("Please fill in the task description.")
      return;
    }

    try {
      const newTask = {
        description: description.trim(),
        status: 'pending',
        date: date ? new Date(date + 'T00:00:00-03:00').toISOString() : undefined,
        projectId,
        userId: session.user.id
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
        alert(result.error || 'Error adding task. Please try again.');
      }

    } catch (error) {
      console.error('Request error:', error);
      toast.error('Connection error. Please try again.');
    }
  }

  return (
    <div className="flex flex-col justify-items-center gap-4 p-4">
      <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-2xl w-full max-w-2xl">
        <textarea
          ref={descriptionRef}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            autoResize();
          }}
          placeholder="Enter a new task"
          rows={1}
          style={{ minHeight: '56px' }}
          className="p-2 rounded w-full text-gray-500 resize-none overflow-hidden"
        />
        <div className="flex gap-2 items-center sm:flex-none">
          <button
            type="button"
            onClick={() => setShowDateInput(!showDateInput)}
            className="bg-gray-200 text-gray-500 p-2 rounded-2xl shrink-0"
            title="Add date"
          >
            <CalendarIcon />
          </button>
          {showDateInput && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="p-1 rounded bg-gray-200 text-gray-500 flex-1 sm:flex-none sm:w-40"
            />
          )}
          <button type="submit" className="bg-gray-200 text-gray-500 px-4 py-2 rounded-2xl shrink-0">
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
              className="flex flex-col gap-2 w-full max-w-2xl min-h-[52px]">
              {list.filter((t) => t.status === 'pending').map((newTask, id) => (
                <Draggable key={newTask.id} draggableId={String(newTask.id)} index={id}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`grid grid-cols-[30px_1fr_24px_24px_24px] sm:grid-cols-[40px_2fr_100px_30px_30px_30px] items-center gap-2 p-2 rounded bg-white text-black`}>
                      <input type="checkbox" className="w-5 h5 accent-gray-600" checked={false}
                        onChange={() => tomarkTask(newTask)} />
                      <span className="break-all">{newTask.description}</span>
                      <span className="hidden sm:block text-right">
                        {newTask.date ? newTask.date.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo' }) : ''}
                      </span>
                      <div className='sm:flex sm:justify-items-end flex sm:flex-row gap-1'>
                        <button
                          className='text-gray-500 rounded hover:bg-gray-200 justify-items-center'
                          onClick={() => openModalEdit(newTask)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          className='text-gray-500 rounded hover:bg-gray-200 justify-items-center'
                          onClick={() => copyTask(newTask.description)}
                          title="Copy task"
                        >
                          <CopyIcon />
                        </button>
                        <button className='text-gray-500 rounded hover:bg-gray-200 justify-items-center' onClick={() => confirmedDelete(newTask)}> <DeleteIcon /></button>
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
        <div className="w-full max-w-2xl">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white text-gray-500 font-bold hover:bg-gray-200"
          >
            <span>Completed ({list.filter((t) => t.status === 'completed').length})</span>
            <span>{showCompleted ? '−' : '+'}</span>
          </button>
          {showCompleted && (
            <ul className="flex flex-col gap-2 mt-2">
              {list.filter((t) => t.status === 'completed').map((newTask) => (
                <li
                  key={newTask.id}
                  className={`grid grid-cols-[30px_1fr_24px_24px_24px] sm:grid-cols-[40px_2fr_100px_30px_30px_30px] items-center gap-2 p-2 rounded bg-gray-200 text-gray-500 line-through`}>
                  <input type="checkbox" className="w-5 h5 accent-gray-600" checked={true}
                    onChange={() => tomarkTask(newTask)} />
                  <span className="break-all">{newTask.description}</span>
                  <span className="hidden sm:block text-right">
                    {newTask.date ? newTask.date.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo' }) : ''}
                  </span>
                  <div className='sm:flex sm:justify-items-end flex sm:flex-row gap-1'>
                    <button
                      className='rounded hover:bg-gray-300 justify-items-center'
                      onClick={() => openModalEdit(newTask)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className='rounded hover:bg-gray-300 justify-items-center'
                      onClick={() => copyTask(newTask.description)}
                      title="Copy task"
                    >
                      <CopyIcon />
                    </button>
                    <button className='rounded hover:bg-gray-300 justify-items-center' onClick={() => confirmedDelete(newTask)}> <DeleteIcon /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {showModalDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-40 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Confirm deletion</h2>
            <p className='text-gray-500'>Are you sure you want to delete the task?</p>

            <div className="mt-6 flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded font-bold text-gray-500 bg-gray-300 hover:bg-gray-400"
                onClick={() => setShowModalDelete(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded font-bold bg-gray-800 text-white hover:bg-gray-950"
                onClick={deleteConfirmedTask}
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
            <h2 className="text-lg text-gray-500 font-bold mb-4">Edit Task</h2>

            <input
              type="text"
              value={descriptionEdit}
              onChange={(e) => setDescriptionEdit(e.target.value)}
              placeholder="Description"
              className="w-full text-gray-500 p-2 rounded mb-2 border border-gray-300"
            />
            <input
              type="date"
              value={dateEdit}
              onChange={(e) => setDateEdit(e.target.value)}
              className="w-full text-gray-500 p-2 rounded mb-2 border border-gray-300"
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
                onClick={() => {
                  if (taskEdit) {
                    saveEdit(taskEdit, descriptionEdit, dateEdit);
                    setShowModalEdit(false);
                    setTaskEdit(null);
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
