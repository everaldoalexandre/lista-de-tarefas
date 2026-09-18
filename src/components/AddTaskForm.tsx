'use client';

import { useRef, useState } from 'react';
import { CalendarIcon } from './Lucide';
import { toast } from "sonner";
import { parseTaskInput } from '@/lib/nlp-parse';

export default function AddTaskForm({ projectId, onTaskAdded }: { projectId?: string; onTaskAdded: () => Promise<void> }) {
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [priority, setPriority] = useState('none');
  const [tagsInput, setTagsInput] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 64)}px`;
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
      const parsed = parseTaskInput(description);
      const finalDescription = parsed.description || description.trim();
      const parsedTags = Array.from(new Set([
        ...(tagsInput.trim() ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : []),
        ...parsed.tags,
      ])).slice(0, 10);

      if (parsed.date || parsed.priority || parsed.tags.length > 0) {
        toast.info('Detected from text: ' + [
          parsed.date && `date ${parsed.date}`,
          parsed.priority && `priority ${parsed.priority}`,
          parsed.tags.length > 0 && `tags #${parsed.tags.join(' #')}`,
        ].filter(Boolean).join(', '));
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTask: {
            description: finalDescription,
            date: date
              ? new Date(`${date}T${time || '00:00'}`).toISOString()
              : parsed.date
                ? new Date(`${parsed.date}T00:00:00`).toISOString()
                : undefined,
            projectId,
            recurrence: recurrence !== 'none' ? recurrence : undefined,
            priority: priority !== 'none' ? priority : parsed.priority,
            tags: parsedTags.length > 0 ? parsedTags : undefined,
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        setDescription('');
        setDate('');
        setTime('');
        setRecurrence('none');
        setPriority('none');
        setTagsInput('');
        setShowDateInput(false);
        if (descriptionRef.current) descriptionRef.current.style.height = 'auto';
        await onTaskAdded();
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
    <form onSubmit={addTask} className="flex flex-col gap-2 bg-card border border-border shadow-sm p-3 rounded-2xl w-full">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
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
          className="p-2 rounded-lg flex-1 text-foreground placeholder:text-muted-foreground resize-none overflow-hidden bg-transparent outline-none"
        />
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowDateInput(!showDateInput)}
            aria-expanded={showDateInput}
            className={`p-2 rounded-xl shrink-0 transition-colors ${showDateInput ? 'bg-primary/15 text-primary' : 'bg-accent text-accent-foreground hover:bg-accent/80'}`}
            title="Add date, repeat, priority and tags"
            aria-label="More options"
          >
            <CalendarIcon />
          </button>
          <button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl shrink-0 disabled:opacity-50 font-bold transition-colors" aria-label="Add task">
            +
          </button>
        </div>
      </div>
      {showDateInput && (
        <div className="flex flex-wrap gap-2 pt-1">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-accent text-foreground sm:w-40" aria-label="Due date" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="px-3 py-2 rounded-lg bg-accent text-foreground" aria-label="Due time" />
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}
            className="px-3 py-2 rounded-lg bg-accent text-foreground cursor-pointer" aria-label="Repeat">
            <option value="none">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2 rounded-lg bg-accent text-foreground capitalize cursor-pointer" aria-label="Priority">
            <option value="none">No priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
            placeholder="tags, comma separated" aria-label="Tags"
            className="px-3 py-2 rounded-lg bg-accent text-foreground placeholder:text-muted-foreground flex-1 min-w-[10rem]" />
        </div>
      )}
    </form>
  );
}
