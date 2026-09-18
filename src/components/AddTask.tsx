'use client';

import { useState, useEffect, useRef } from 'react';
import { DeleteIcon, EditIcon, CalendarIcon, CopyIcon } from './Lucide';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import AddTaskForm from './AddTaskForm';
import type { Task } from '@/type/type';
import { toast } from "sonner"
import { STATUS_COLUMNS, dueBadgeClass, formatDueDate, normalizeStatus, priorityStyles, toTimeInputValue } from '@/lib/task-utils';

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function AddTask({ query, projectId, readOnly, view = 'list', onTasksChanged }: { query: string; projectId?: string; readOnly?: boolean; view?: 'list' | 'board' | 'calendar'; onTasksChanged: () => void }) {
  const [list, setList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [taskSelected, setTaskSelected] = useState<Task | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const [taskEdit, setTaskEdit] = useState<Task | null>(null);
  const [descriptionEdit, setDescriptionEdit] = useState('');
  const [dateEdit, setDateEdit] = useState('');
  const [timeEdit, setTimeEdit] = useState('');
  const [priorityEdit, setPriorityEdit] = useState('none');
  const [recurrenceEdit, setRecurrenceEdit] = useState('none');
  const [tagsEdit, setTagsEdit] = useState('');
  const [projectEdit, setProjectEdit] = useState('');
  const [editProjects, setEditProjects] = useState<{ id: string; name: string }[]>([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const editInitialRef = useRef<{
    description: string;
    date: string;
    time: string;
    priority: string;
    recurrence: string;
    tags: string;
    project: string;
  } | null>(null);
  const editDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const [subtasks, setSubtasks] = useState<{ id: string; description: string; done: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    const el = editDescriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(Math.min(el.scrollHeight, 192), 64)}px`;
  }, [descriptionEdit, taskEdit]);

  useEffect(() => {
     
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
          date: dateEdit ? new Date(`${dateEdit}T${timeEdit || '00:00'}`).toISOString() : null,
          priority: priorityEdit === 'none' ? null : priorityEdit,
          recurrence: recurrenceEdit,
          tags: tagsEdit.split(',').map((t) => t.trim()).filter((t) => t.length >= 1 && t.length <= 24).slice(0, 10),
          projectId: projectEdit || null,
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
    if (filterPriority || filterTag) return;

    const sourceColumn = result.source.droppableId;
    const destColumn = result.destination.droppableId;

    if (sourceColumn === destColumn && result.source.index === result.destination.index && view === 'board') return;

    const dragged = list.find((t) => t.id === result.draggableId);
    if (!dragged) return;

    if (destColumn !== dragged.status && ['todo', 'doing', 'done'].includes(destColumn)) {
      changeStatus(dragged, destColumn);
      return;
    }

    const columnIds =
      view === 'board'
        ? list.filter((t) => normalizeStatus(t.status) === sourceColumn).map((t) => t.id)
        : [...pending().map((task) => task.id), ...completed.map((t) => t.id)];

    const reordered = Array.from(columnIds);
    reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, result.draggableId);

    const newList = [
      ...list.filter((t) => !columnIds.includes(t.id)),
      ...reordered.map((id) => list.find((t) => t.id === id)!),
    ];

    setList(sortPinned(newList));

    try {
      const order = [
        ...newList.filter((t) => t.status !== 'done').map((task) => task.id),
        ...newList.filter((t) => t.status === 'done').map((t) => t.id),
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

  async function changeStatus(task: Task, newStatus: string) {
    if (readOnly || !['todo', 'doing', 'done'].includes(newStatus)) return;
    const previousList = list;
    setList(list.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      if (!response.ok) throw new Error('Error updating status');
      onTasksChanged();
    } catch {
      toast.error('Error updating status');
      setList(previousList);
    }
  }

  function togglePin(task: Task) {
    if (readOnly) return;
    const previousList = list;
    const newPinned = !task.pinned;
    setList(sortPinned(list.map((t) => (t.id === task.id ? { ...t, pinned: newPinned } : t))));

    fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, pinned: newPinned }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('failed');
      })
      .catch(() => {
        toast.error('Could not update the task.');
        setList(previousList);
      });
  }

  function sortPinned(items: Task[]) {
    return [...items].sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false));
  }

  function tomarkTask(task: Task) {
    if (readOnly) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    changeStatus(task, newStatus);
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
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: deleted.id, restore: true }),
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

  async function clearCompleted() {
    const ids = completed.map((t) => t.id);
    if (ids.length === 0) return;

    const previous = list;
    setList(list.filter((t) => !ids.includes(t.id)));

    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch('/api/tasks', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          })
        )
      );

      if (results.some((r) => !r.ok)) throw new Error('clear failed');

      toast.success('Completed tasks moved to trash!');
      await toloadTask();
      onTasksChanged();
    } catch (error) {
      console.error('Request error:', error);
      toast.error('Could not clear completed tasks.');
      setList(previous);
    }
  }

  async function toloadTask() {
    try {
      const tz = new Date().getTimezoneOffset();
      const response = await fetch(`/api/tasks?${query}${query ? '&' : ''}tz=${tz}`);

      if (response.ok) {
        const data: { list: { id: string, description: string; date: string | null; status: string; order: number; projectId: string | null; userId: string; recurrence?: string | null; priority?: string | null; tags?: string[]; pinned?: boolean }[] } = await response.json();

        setList(sortPinned(data.list.map((item) => ({
          ...item,
          status: normalizeStatus(item.status),
          date: item.date ? new Date(item.date) : null,
          tags: item.tags ?? [],
        }))));
      } else {
        toast.error('Error loading tasks.');
        console.error('Error loading tasks', response.statusText);
      }
    } finally {
      setLoading(false);
    }
  }

  function matchesFilters(t: Task) {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterTag && !(t.tags ?? []).includes(filterTag)) return false;
    return true;
  }

  function pending() {
    return sortPinned(list.filter((t) => t.status !== 'done' && matchesFilters(t)));
  }

  const pendingTasks = pending();
  const completed = sortPinned(list.filter((t) => t.status === 'done' && matchesFilters(t)));
  const allTags = Array.from(new Set(list.flatMap((t) => t.tags ?? []))).sort();

  function openModalEdit(task: Task) {
    setTaskEdit(task);
    setDescriptionEdit(task.description);
    setDateEdit(task.date ? toDateInputValue(task.date) : '');
    setTimeEdit(task.date ? toTimeInputValue(task.date) : '');
    setPriorityEdit(task.priority ?? 'none');
    setRecurrenceEdit(task.recurrence ?? 'none');
    setTagsEdit((task.tags ?? []).join(', '));
    setProjectEdit(task.projectId ?? '');
    editInitialRef.current = {
      description: task.description,
      date: task.date ? toDateInputValue(task.date) : '',
      time: task.date ? toTimeInputValue(task.date) : '',
      priority: task.priority ?? 'none',
      recurrence: task.recurrence ?? 'none',
      tags: (task.tags ?? []).join(', '),
      project: task.projectId ?? '',
    };
    setSubtasks(task.subtasks ?? []);
    setNewSubtask('');
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data: { projects: { id: string; name: string }[] }) => setEditProjects(data.projects ?? []))
      .catch(() => setEditProjects([]));
  }

  function isEditDirty() {
    const init = editInitialRef.current;
    if (!taskEdit || !init) return false;
    return (
      descriptionEdit !== init.description ||
      dateEdit !== init.date ||
      timeEdit !== init.time ||
      priorityEdit !== init.priority ||
      recurrenceEdit !== init.recurrence ||
      tagsEdit !== init.tags ||
      projectEdit !== init.project
    );
  }

  function requestCloseEdit() {
    if (isEditDirty()) {
      setShowDiscardConfirm(true);
    } else {
      setTaskEdit(null);
    }
  }

  function discardEdit() {
    setShowDiscardConfirm(false);
    setTaskEdit(null);
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskEdit || !newSubtask.trim()) return;
    const description = newSubtask.trim();
    setNewSubtask('');

    try {
      const response = await fetch('/api/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskEdit.id, description }),
      });
      if (!response.ok) throw new Error();
      const { subtask } = await response.json();
      setSubtasks((prev) => [...prev, subtask]);
    } catch {
      toast.error('Could not add the step.');
    }
  }

  async function toggleSubtask(st: { id: string; done: boolean }) {
    setSubtasks((prev) => prev.map((s) => (s.id === st.id ? { ...s, done: !st.done } : s)));
    try {
      const response = await fetch('/api/subtasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: st.id, done: !st.done }),
      });
      if (!response.ok) throw new Error();
    } catch {
      toast.error('Could not update the step.');
      setSubtasks((prev) => prev.map((s) => (s.id === st.id ? { ...s, done: st.done } : s)));
    }
  }

  async function removeSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch('/api/subtasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      toast.error('Could not remove the step.');
    }
  }

  function badges(newTask: Task) {
    return (
      <>
        {newTask.priority && (
          <span className={`hidden sm:inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityStyles[newTask.priority] ?? ''}`}>
            {newTask.priority}
          </span>
        )}
        {(newTask.tags ?? []).map((tag) => (
          <button
            key={tag}
            type="button"
            title={`Filter by "${tag}"`}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            className="hidden sm:inline-block rounded-full bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            {tag}
          </button>
        ))}
        <span className={`hidden sm:inline-block rounded-full px-2 py-0.5 text-xs font-medium ${dueBadgeClass(newTask.date)} ${newTask.date ? '' : 'hidden'}`}>
          {newTask.date ? formatDueDate(newTask.date) : ''}
        </span>
      </>
    );
  }

  function rowActions(newTask: Task) {
    return (
      <div className='sm:flex sm:justify-items-end flex sm:flex-row gap-1'>
        {!readOnly && (
          <button
            className={`rounded-md p-0.5 transition-colors ${newTask.pinned ? 'text-amber-500' : 'text-muted-foreground'} hover:text-amber-500 justify-items-center`}
            onClick={() => togglePin(newTask)}
            title={newTask.pinned ? 'Unpin task' : 'Pin task'}
            aria-label={newTask.pinned ? 'Unpin task' : 'Pin task'}
          >
            ★
          </button>
        )}
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
        {!readOnly && (
          <button
            className='text-muted-foreground rounded-md hover:bg-accent hover:text-foreground justify-items-center transition-colors'
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

  const filtersActive = !!filterPriority || !!filterTag;
  const todoGridClass = 'grid grid-cols-[30px_1fr_auto] items-center gap-2 p-2 rounded-lg bg-card border border-border shadow-sm hover:shadow transition-shadow text-card-foreground';

  if (view === 'calendar') {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array.from({ length: firstDow }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const byDay: Record<number, Task[]> = {};
    for (const t of list) {
      if (!t.date) continue;
      if (t.date.getFullYear() === year && t.date.getMonth() === month) {
        (byDay[t.date.getDate()] ??= []).push(t);
      }
    }
    const today = new Date();
    const monthLabel = base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="flex flex-col gap-4 p-4 w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground capitalize">{monthLabel}</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMonthOffset(monthOffset - 1)} aria-label="Previous month"
              className="px-3 py-1 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 text-sm font-semibold transition-colors">‹</button>
            <button type="button" onClick={() => setMonthOffset(0)} className="px-3 py-1 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 text-sm font-medium transition-colors">Today</button>
            <button type="button" onClick={() => setMonthOffset(monthOffset + 1)} aria-label="Next month"
              className="px-3 py-1 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 text-sm font-semibold transition-colors">›</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const isToday =
              day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayTasks = day ? sortPinned(byDay[day] ?? []) : [];
            return (
              <div
                key={i}
                className={`min-h-[84px] rounded-lg border p-1.5 text-xs ${
                  day ? 'border-border bg-card' : 'border-transparent'
                } ${isToday ? 'ring-2 ring-primary' : ''}`}
              >
                {day && <span className={`font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span>}
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      title={t.description}
                      className={`truncate rounded px-1 py-0.5 text-[11px] font-medium ${
                        t.status === 'done'
                          ? 'bg-muted text-muted-foreground line-through'
                          : t.priority === 'high'
                            ? 'bg-destructive/15 text-destructive'
                            : 'bg-primary/10 text-primary dark:bg-primary/20'
                      }`}
                    >
                      {t.description}
                    </span>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {taskDialogs()}
      </div>
    );
  }

  if (view === 'board' && !readOnly) {
    return (
      <div className="flex flex-col gap-4 p-4 w-full">
        {(allTags.length > 0 || list.some((t) => t.priority)) && <FiltersBar />}
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <div className="grid md:grid-cols-3 gap-4 w-full">
            {STATUS_COLUMNS.map((col) => (
              <div key={col.key} className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-2 min-h-[200px]">
                <p className="px-2 py-1 text-sm font-bold text-muted-foreground">
                  {col.label} ({list.filter((t) => normalizeStatus(t.status) === col.key).length})
                </p>
                <Droppable droppableId={col.key}>
                  {(dropProvided) => (
                    <ul {...dropProvided.droppableProps} ref={dropProvided.innerRef} className="flex flex-col gap-2 min-h-[80px]">
                      {sortPinned(list.filter((t) => normalizeStatus(t.status) === col.key)).map((newTask, index) => (
                        <Draggable key={newTask.id} draggableId={newTask.id} index={index} isDragDisabled={filtersActive}>
                          {(dragProvided) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}
                              className="flex flex-col gap-1 p-3 rounded-xl bg-card border border-border shadow-sm hover:shadow transition-shadow text-card-foreground">
                              <span className="break-all whitespace-pre-wrap text-sm font-medium">{newTask.pinned && '★ '}{newTask.description}</span>
                              <span className="flex flex-wrap gap-1">{badges(newTask)}</span>
                              {rowActions(newTask)}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        {taskDialogs()}
      </div>
    );
  }

  function FiltersBar() {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        {(['high', 'medium', 'low'] as const).map((p) => (
          <button key={p} type="button" onClick={() => setFilterPriority(filterPriority === p ? null : p)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${filterPriority === p ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground hover:bg-accent/80'}`}>
            {p}
          </button>
        ))}
        {allTags.map((tag) => (
          <button key={tag} type="button" onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${filterTag === tag ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-accent'}`}>
            #{tag}
          </button>
        ))}
        {(filterPriority || filterTag) && (
          <button type="button" onClick={() => { setFilterPriority(null); setFilterTag(null); }}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            clear
          </button>
        )}
      </div>
    );
  }

  function taskDialogs() {
    return (
      <>
        <Dialog open={!!taskSelected} onOpenChange={(open) => !open && setTaskSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm deletion</DialogTitle>
              <DialogDescription>Are you sure you want to delete the task? You can undo it right after.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors" onClick={() => setTaskSelected(null)}>Cancel</button>
              <button className="px-4 py-2 rounded-lg font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors" onClick={deleteConfirmedTask}>Delete</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!taskEdit} onOpenChange={(open) => !open && requestCloseEdit()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <textarea
              ref={editDescriptionRef}
              value={descriptionEdit}
              onChange={(e) => setDescriptionEdit(e.target.value)}
              placeholder="Description"
              rows={1}
              className="w-full min-h-[64px] max-h-48 text-foreground p-2 rounded-lg border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden"
            />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={dateEdit} onChange={(e) => setDateEdit(e.target.value)}
              aria-label="Due date"
              className="w-full text-foreground p-2 rounded-lg border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring" />
            <input type="time" value={timeEdit} onChange={(e) => setTimeEdit(e.target.value)}
              aria-label="Due time"
              className="w-full text-foreground p-2 rounded-lg border border-border bg-transparent outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={priorityEdit} onChange={(e) => setPriorityEdit(e.target.value)}
              aria-label="Priority"
              className="p-2 rounded-lg border border-border bg-transparent text-foreground capitalize outline-none focus:ring-2 focus:ring-ring cursor-pointer">
              <option value="none">No priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={recurrenceEdit} onChange={(e) => setRecurrenceEdit(e.target.value)}
              aria-label="Repeat"
              className="p-2 rounded-lg border border-border bg-transparent text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer">
              <option value="none">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <input type="text" value={tagsEdit} onChange={(e) => setTagsEdit(e.target.value)}
            placeholder="tags, comma separated" aria-label="Tags"
            className="w-full p-2 rounded-lg border border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" />
          <select value={projectEdit} onChange={(e) => setProjectEdit(e.target.value)}
            aria-label="Project"
            className="w-full p-2 rounded-lg border border-border bg-transparent text-sm text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer">
            <option value="">No project</option>
            {editProjects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Checklist</span>
            {subtasks.map((st) => (
              <div key={st.id} className="flex items-center gap-2">
                <input type="checkbox" checked={st.done} onChange={() => toggleSubtask(st)}
                  aria-label={st.description}
                  className="w-4 h-4 accent-foreground cursor-pointer" />
                <span className={`flex-1 text-sm text-foreground ${st.done ? 'line-through text-muted-foreground' : ''}`}>{st.description}</span>
                <button type="button" onClick={() => removeSubtask(st.id)} aria-label="Remove step"
                  className="text-muted-foreground hover:text-destructive transition-colors px-1">✕</button>
              </div>
            ))}
            <form onSubmit={addSubtask} className="flex gap-2">
              <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add a step..."
                aria-label="New step"
                className="flex-1 p-2 rounded-lg border border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" className="px-3 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 text-sm font-medium transition-colors">+</button>
            </form>
          </div>
            <DialogFooter>
              <button className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors" onClick={requestCloseEdit}>Cancel</button>
              <button className="px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={async () => { const saved = await saveEdit(); if (saved) setTaskEdit(null); }}>Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Discard changes?</DialogTitle>
              <DialogDescription>Your edits to this task have not been saved yet.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors" onClick={() => setShowDiscardConfirm(false)}>Keep editing</button>
              <button className="px-4 py-2 rounded-lg font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors" onClick={discardEdit}>Discard</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 min-h-[180px] w-full max-w-2xl">
      {!readOnly && projectId && (
        <AddTaskForm projectId={projectId} onTaskAdded={toloadTask} />
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

      {(allTags.length > 0 || list.some((t) => t.priority)) && <FiltersBar />}

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="list" isDropDisabled={readOnly}>
          {(dropProvided) => (
            <ul {...dropProvided.droppableProps} ref={dropProvided.innerRef} className="flex flex-col gap-2 w-full">
              {pendingTasks.map((newTask, index) => (
                <Draggable key={newTask.id} draggableId={newTask.id} index={index} isDragDisabled={readOnly || filtersActive}>
                  {(dragProvided) => (
                    <li ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}
                      className={todoGridClass}>
                      <input type="checkbox" className="w-5 h-5 accent-foreground cursor-pointer" checked={false} disabled={readOnly}
                        aria-label="Mark task as completed"
                        onChange={() => tomarkTask(newTask)} />
                      <span className="break-all whitespace-pre-wrap flex flex-col gap-1">
                        {newTask.pinned && <span className="text-amber-500 text-xs not-italic">★ pinned</span>}
                        {newTask.description}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">{badges(newTask)}</div>
                      {rowActions(newTask)}
                    </li>
                  )}
                </Draggable>
              ))}
              {dropProvided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>

      {completed.length > 0 && (
        <div className="w-full">
          <CompletedSection
            count={completed.length}
            tasks={completed}
            readOnly={readOnly}
            onToggleTask={tomarkTask}
            renderActions={rowActions}
            onClearCompleted={clearCompleted}
          />
        </div>
      )}

      {taskDialogs()}
    </div>
  );
}

function CompletedSection({ count, tasks, readOnly, onToggleTask, renderActions, onClearCompleted }: { count: number; tasks: Task[]; readOnly?: boolean; onToggleTask: (task: Task) => void; renderActions: (task: Task) => React.ReactNode; onClearCompleted: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function confirmClear() {
    if (clearing) return;
    setClearing(true);
    try {
      await onClearCompleted();
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  }

  return (
    <>
      <div className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex-1 flex items-center justify-between text-foreground font-bold hover:text-accent-foreground transition-colors text-left"
        >
          <span>Completed ({count})</span>
          <span>{open ? '−' : '+'}</span>
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            title="Move all completed tasks to trash"
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {open && (
        <ul className="flex flex-col gap-2 mt-2">
          {tasks.map((newTask) => (
            <li key={newTask.id} className={`grid grid-cols-[30px_1fr_auto] items-center gap-2 p-2 rounded-lg bg-muted text-muted-foreground line-through`}>
              <input type="checkbox" className="w-5 h-5 accent-foreground cursor-pointer" checked={true} disabled={readOnly}
                aria-label="Mark task as pending"
                onChange={() => onToggleTask(newTask)} />
              <span className="break-all whitespace-pre-wrap">{newTask.description}</span>
              {renderActions(newTask)}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-md">
          <h2 className="text-lg text-foreground font-bold mb-2">Clear completed?</h2>
          <p className="text-muted-foreground">
            Move all {count} completed task{count === 1 ? '' : 's'} to the trash? You can restore them from there.
          </p>
          <div className="mt-2 flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium text-foreground bg-accent hover:bg-accent/80 transition-colors"
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
              onClick={confirmClear}
              disabled={clearing}
            >
              {clearing ? 'Moving...' : 'Move to trash'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
