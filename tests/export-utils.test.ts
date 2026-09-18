import { describe, it, expect } from 'vitest';
import { buildCsvExport, buildJsonExport, escapeCsvCell } from '@/lib/export-utils';

describe('escapeCsvCell', () => {
  it('neutraliza formula injection', () => {
    expect(escapeCsvCell('=cmd()')).toBe(`'"=cmd()"`);
    expect(escapeCsvCell('+1+1')).toBe(`'"+1+1"`);
    expect(escapeCsvCell('-2+3')).toBe(`'"-2+3"`);
    expect(escapeCsvCell('@sum')).toBe("'" + '"@sum"');
  });

  it('escapa aspas e mantem texto normal', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('Buy milk')).toBe('"Buy milk"');
  });
});

describe('buildCsvExport', () => {
  it('gera cabecalho + linhas com data formatada', () => {
    const csv = buildCsvExport([
      { description: 'Buy milk', status: 'pending', date: '2026-09-18T12:00:00.000Z', project: { name: 'Home' } },
      { description: 'No date', status: 'done', date: null, project: null },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('description,status,date,project');
    expect(lines[1]).toBe('"Buy milk",pending,2026-09-18,"Home"');
    expect(lines[2]).toBe('"No date",done,,""');
  });
});

describe('buildJsonExport', () => {
  it('inclui todas as secoes', () => {
    const data = {
      exportedAt: '2026-09-18T00:00:00.000Z',
      projects: [],
      tasks: [],
      notes: [],
      habits: [],
      focusLast7Days: { byDay: {}, weekTotal: 0 },
    };
    const parsed = JSON.parse(buildJsonExport(data));
    expect(Object.keys(parsed).sort()).toEqual(
      ['exportedAt', 'focusLast7Days', 'habits', 'notes', 'projects', 'tasks'].sort()
    );
  });
});
