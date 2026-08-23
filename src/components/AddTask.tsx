'use client';

import { useState, useEffect, useRef } from 'react';
import { DeleteIcon, EditIcon, CalendarIcon, CopyIcon } from './Lucide';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Task } from '@/type/type';
import { toast } from "sonner"
import { dueBadgeClass, formatDueDate } from '@/lib/task-utils';

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function AddTask({ query, projectId, readOnly, onTasksChanged }: { query: string; projectId?: string; readOnly?: boolean; onTasksChanged: () => void }) {
  const [list, setList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [showDateInput, setShowDateInput] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [taskSelected, setTaskSelected] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao trocar de lista
    setLoading(true);
    toloadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function saveEdit() {
    if (!taskEdit) return false;
    if (!descriptionEdit.trim()) {
      toast.error('Please fill in the task description.');
      return false;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskEdit.id,
          description: descriptionEdit.trim(),
          date: dateEdit ? new Date(`${dateEdit}T00:00:00`).toISOString() : null,
        }),
      });

      if (!response.ok) throw new Error('Error updating task');

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
    if (!result.destination || readOnly) return;

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

      if (!response.ok) throw new Error('Error saving new order');
    } catch (error) {
      console.error('Error saving new order:', error);
      toast.error('Unable to save new order.');
      toloadTask();
    }
  }

  function tomarkTask(task: Task) {
    if (readOnly) return;
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

    const snapshot = list;
    const deleted = taskSelected;

    setList(list.filter((t) => t.id !== deleted.id));
    setTaskSelected(null);

    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleted.id }),
      });

      if (!response.ok) throw new Error('Error deleting task');

      onTasksChanged();

      toast.success('Task deleted!', {
        action: {
          label: 'Undo',
          onClick: () => {
            fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                newTask: {
                  description: deleted.description,
                  date: deleted.date ? deleted.date.toISOString() : undefined,
                  projectId: deleted.projectId,
                },
              }),
            })
              .then(async (r) => {
                if (!r.ok) throw new Error('undo failed');
                await toloadTask();
                onTasksChanged();
              })
              .catch(() => {
                toast.error('Could not restore the task.');
                setList(snapshot);
              });
          },
        },
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Connection error. Please try again.');
      setList(snapshot);
    }
  }

  async function toloadTask() {
    try {
      const response = await fetch(`/api/tasks?${query}`);

      if (response.ok) {
        const data: { list: { id: string, description: string; date: string | null; status: string; order: number; projectId: string | null; userId: string; recurrence?: string | null }[] } = await response.json();

        setList(data.list.map((item) => ({
          ...item,
          date: item.date ? new Date(item.date) : null,
        })));
      } else {
        toast.error('Error loading tasks.');
        console.error('Error loading tasks', response.statusText);
      }
    } finally {
      setLoading(false);
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
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTask: {
            description: description.trim(),
            date: date ? new Date(`${date}T00:00:00`).toISOString() : undefined,
            projectId,
            recurrence: recurrence !== 'none' ? recurrence : undefined,
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        setDescription('');
        setDate('');
        setRecurrence('none');
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

  const pending = list.filter((t) => t.status === 'pending');
  const completed = list.filter((t) => t.status === 'completed');

  function rowActions(newTask: Task, hover: string) {
    return (
      <div className='sm:flex sm:justify-items-end flex sm:flex-row gap-1'>
        <button
          className={`text-muted-foreground rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors ${hover}`}
          onClick={() => openModalEdit(newTask)}
          title="Edit task"
          aria-label="Edit task"
        >
          <EditIcon />
        </button>
        <button
          className={`text-muted-foreground rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors ${hover}`}
          onClick={() => copyTask(newTask.description)}
          title="Copy task"
          aria-label="Copy task"
        >
          <CopyIcon />
        </button>
        {!readOnly && (
          <button
            className={`text-muted-foreground rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors ${hover}`}
            onClick={() => setTaskSelected(newTask)}
            title="Delete task"
            aria-label="Delete task"
          >
            {' '}<DeleteIcon />
          </button>
        )}
      </div>
    );
  }

  function openModalEdit(task: Task) {
    setTaskEdit(task);
    setDescriptionEdit(task.description);
    setDateEdit(task.date ? toDateInputValue(task.date) : '');
  }

  function dateBadge(d: Task) {
    return d.date ? (
      <span className={`hidden sm:inline-block rounded-full px-2 py-0.5 text-xs font-medium ${dueBadgeClass(d.date)} ${readOnly ? '' : 'text-right'}`}>
        {formatDueDate(d.date)}
      </span>
    ) : <span className="hidden sm:block" />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4 w-full max-w-2xl">
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        {[0, 1].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 min-h-[180px] w-full max-w-2xl">
      {!readOnly && projectId && (
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
              <>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="p-1 rounded-lg bg-accent text-foreground flex-1 sm:flex-none sm:w-36"
                />
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="p-1 rounded-lg bg-accent text-foreground sm:w-24"
                  aria-label="Repeat"
                >
                  <option value="none">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </>
            )}
            <button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl shrink-0 disabled:opacity-50 font-bold transition-colors" aria-label="Add task">
              +
            </button>
          </div>
        </form>
      )}

      {list.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-10 text-center">
          <CalendarIcon />
          <p className="text-sm font-semibold text-foreground">
            {readOnly ? 'Nothing due here.' : 'No tasks yet.'}
          </p>
          <p className="text-xs text-muted-foreground">
            {readOnly ? 'Tasks with a due date will appear in this view.' : 'Create your first task using the field above.'}
          </p>
        </div>
      )}

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="tasks" isDropDisabled={readOnly}>
          {(provided) => (
            <ul
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex flex-col gap-2 w-full">
              {pending.map((newTask, id) => (
                <Draggable key={newTask.id} draggableId={String(newTask.id)} index={id} isDragDisabled={readOnly}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`grid grid-cols-[30px_1fr_24px_24px_24px] sm:grid-cols-[40px_2fr_100px_30px_30px_30px] items-center gap-2 p-2 rounded-lg bg-card border border-border shadow-sm hover:shadow transition-shadow text-card-foreground`}>
                      <input type="checkbox" className="w-5 h-5 accent-foreground cursor-pointer" checked={false} disabled={readOnly}
                        aria-label="Mark task as completed"
                        onChange={() => tomarkTask(newTask)} />
                      <span className="break-all">{newTask.description}</span>
                      {dateBadge(newTask)}
                      {rowActions(newTask, '')}
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>

      {completed.length > 0 && (
        <div className="w-full">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border shadow-sm text-foreground font-bold hover:bg-accent transition-colors"
          >
            <span>Completed ({completed.length})</span>
            <span>{showCompleted ? '−' : '+'}</span>
          </button>
          {showCompleted && (
            <ul className="flex flex-col gap-2 mt-2">
              {completed.map((newTask) => (
                <li
                  key={newTask.id}
                  className={`grid grid-cols-[30px_1fr_24px_24px_24px] sm:grid-cols-[40px_2fr_100px_30px_30px_30px] items-center gap-2 p-2 rounded-lg bg-muted text-muted-foreground line-through`}>
                  <input type="checkbox" className="w-5 h-5 accent-foreground cursor-pointer" checked={true} disabled={readOnly}
                    aria-label="Mark task as pending"
                    onChange={() => tomarkTask(newTask)} />
                  <span className="break-all">{newTask.description}</span>
                  {dateBadge(newTask)}
                  {rowActions(newTask, '')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog open={!!taskSelected} onOpenChange={(open) => !open && setTaskSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>Are you sure you want to delete the task? You can undo it right after.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
              onClick={() => setTaskSelected(null)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors"
              onClick={deleteConfirmedTask}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!taskEdit} onOpenChange={(open) => !open && setTaskEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={descriptionEdit}
            onChange={(e) => setDescriptionEdit(e.target.value)}
            placeholder="Description"
            className="w-full text-foreground p-2 rounded-lg border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="date"
            value={dateEdit}
            onChange={(e) => setDateEdit(e.target.value)}
            className="w-full text-foreground p-2 rounded-lg border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring"
          />
          <DialogFooter>
            <button
              className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
              onClick={() => setTaskEdit(null)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={async () => {
                const saved = await saveEdit();
                if (saved) setTaskEdit(null);
              }}
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
