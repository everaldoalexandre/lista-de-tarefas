export type Recurrence = 'daily' | 'weekly' | 'monthly';

export const STATUS_COLUMNS = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
] as const;

export function normalizeStatus(status: string) {
  if (status === 'pending') return 'todo';
  if (status === 'completed') return 'done';
  return status;
}

export const priorityStyles: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive',
  medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isOverdue(date: Date | null) {
  if (!date) return false;
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

export function isToday(date: Date | null) {
  if (!date) return false;
  return startOfDay(date).getTime() === startOfDay(new Date()).getTime();
}

export function dueBadgeClass(date: Date | null) {
  if (!date) return '';
  if (isOverdue(date)) return 'bg-destructive/15 text-destructive';
  if (isToday(date)) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
  return 'bg-muted text-muted-foreground';
}

export function formatDueDate(date: Date) {
  return date.toLocaleDateString('en-US');
}

export function nextOccurrence(date: Date | null, recurrence: Recurrence) {
  const base = date ?? new Date();
  const next = new Date(base);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}
