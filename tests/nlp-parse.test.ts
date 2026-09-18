import { describe, expect, it } from 'vitest';
import { parseTaskInput } from '@/lib/nlp-parse';

describe('parseTaskInput', () => {
  it('extracts priority and tags', () => {
    const result = parseTaskInput('Finish report p1 #work #urgent');
    expect(result.description).toBe('Finish report');
    expect(result.priority).toBe('high');
    expect(result.tags).toEqual(['work', 'urgent']);
  });

  it('extracts today and tomorrow in english and portuguese', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(parseTaskInput('buy milk today').date).toBe(today);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = tomorrow.toISOString().slice(0, 10);
    expect(parseTaskInput('amanhã estudar').description).toBe('estudar');
    expect(parseTaskInput('amanhã estudar').date).toBe(expected);
  });

  it('maps next weekday', () => {
    const result = parseTaskInput('call mom friday p3');
    expect(result.date).toBeDefined();
    expect(result.priority).toBe('low');
    expect(new Date(`${result.date}T12:00:00`).getDay()).toBe(5);
  });

  it('maps portuguese weekdays', () => {
    const next = (target: number) => {
      const d = new Date();
      d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
      return d.toISOString().slice(0, 10);
    };
    expect(parseTaskInput('reuniao sexta').date).toBe(next(5));
    expect(parseTaskInput('reuniao sexta').description).toBe('reuniao');
    expect(parseTaskInput('estudar segunda').date).toBe(next(1));
    expect(parseTaskInput('prova terca').date).toBe(next(2));
  });

  it('consumes hyphenated -feira but keeps standalone feira', () => {
    const friday = parseTaskInput('reuniao sexta-feira');
    expect(friday.description).toBe('reuniao');
    expect(friday.date).toBeDefined();

    const market = parseTaskInput('vou a feira sexta');
    expect(market.description).toBe('vou a feira');
    expect(market.date).toBeDefined();
  });

  it('keeps plain text untouched', () => {
    const result = parseTaskInput('Simple task with no markers');
    expect(result.description).toBe('Simple task with no markers');
    expect(result.date).toBeUndefined();
    expect(result.priority).toBeUndefined();
    expect(result.tags).toEqual([]);
  });

  it('preserves line breaks', () => {
    const result = parseTaskInput('teste\n\nteste\n\ntesdas,\n\ndasdsad\n\n-dasadsa\n-dadsa');
    expect(result.description).toBe('teste\n\nteste\n\ntesdas,\n\ndasdsad\n\n-dasadsa\n-dadsa');
  });

  it('keeps multiline structure when removing markers', () => {
    const result = parseTaskInput('Buy milk\ntomorrow\nCall mom #home');
    expect(result.description).toBe('Buy milk\n\nCall mom');
    expect(result.date).toBeDefined();
    expect(result.tags).toEqual(['home']);
  });

  it('collapses horizontal whitespace and caps blank lines', () => {
    const result = parseTaskInput('Buy   milk\t\tand eggs\n\n\n\nCall mom');
    expect(result.description).toBe('Buy milk and eggs\n\nCall mom');
  });
});
