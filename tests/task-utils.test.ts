import { describe, expect, it } from 'vitest';
import { dueBadgeClass, isOverdue, isToday, nextOccurrence } from '@/lib/task-utils';

describe('isOverdue', () => {
  it('returns true for past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isOverdue(yesterday)).toBe(true);
  });

  it('returns false for today', () => {
    expect(isOverdue(new Date())).toBe(false);
  });

  it('returns false for null', () => {
    expect(isOverdue(null)).toBe(false);
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
    expect(dueBadgeClass(new Date())).toContain('amber');
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
