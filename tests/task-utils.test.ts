import { describe, expect, it } from 'vitest';
import { dueBadgeClass, formatDueDate, hasTimeOfDay, isOverdue, isToday, nextOccurrence, toTimeInputValue } from '@/lib/task-utils';

describe('isOverdue', () => {
  it('returns true for past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isOverdue(yesterday)).toBe(true);
  });

  it('returns false for today (date-only)', () => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    expect(isOverdue(todayMidnight)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isOverdue(null)).toBe(false);
  });

  it('respects the exact hour when set', () => {
    const pastHour = new Date(Date.now() - 60 * 60 * 1000);
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    expect(isOverdue(pastHour)).toBe(true);
    expect(isOverdue(nextHour)).toBe(false);
  });

  it('treats future instants as not overdue yet', () => {
    const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(isOverdue(inTwoHours)).toBe(false);
    expect(hasTimeOfDay(inTwoHours)).toBe(true);
  });
});

describe('formatDueDate', () => {
  it('shows only the date without time', () => {
    const d = new Date(2026, 7, 26, 0, 0, 0);
    expect(formatDueDate(d)).toBe(d.toLocaleDateString('en-US'));
  });

  it('includes the hour when set', () => {
    const d = new Date(2026, 7, 26, 14, 30, 0);
    const text = formatDueDate(d);
    expect(text).toContain('02:30 PM');
    expect(text).not.toBe(d.toLocaleDateString('en-US'));
  });
});

describe('toTimeInputValue', () => {
  it('formats HH:mm or empty', () => {
    expect(toTimeInputValue(new Date(2026, 7, 26, 9, 5, 0))).toBe('09:05');
    expect(toTimeInputValue(new Date(2026, 7, 26, 0, 0, 0))).toBe('');
    expect(toTimeInputValue(null)).toBe('');
  });
});

describe('isToday', () => {
  it('returns true for today regardless of time', () => {
    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0, 0, 0, 0);
    expect(isToday(todayAtMidnight)).toBe(true);
  });

  it('returns false for other days', () => {
    const other = new Date();
    other.setDate(other.getDate() + 2);
    expect(isToday(other)).toBe(false);
  });
});

describe('dueBadgeClass', () => {
  it('marks overdue as destructive', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(dueBadgeClass(yesterday)).toContain('destructive');
  });

  it('marks today as amber', () => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    expect(dueBadgeClass(todayMidnight)).toContain('amber');
  });

  it('returns empty for no date', () => {
    expect(dueBadgeClass(null)).toBe('');
  });
});

describe('nextOccurrence', () => {
  it('adds one day for daily', () => {
    const base = new Date('2026-01-10T00:00:00');
    const next = nextOccurrence(base, 'daily');
    expect(next.getDate()).toBe(11);
  });

  it('adds seven days for weekly', () => {
    const base = new Date('2026-01-10T00:00:00');
    expect(nextOccurrence(base, 'weekly').getDate()).toBe(17);
  });

  it('adds one month for monthly', () => {
    const base = new Date('2026-01-10T00:00:00');
    const next = nextOccurrence(base, 'monthly');
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(10);
  });
});
