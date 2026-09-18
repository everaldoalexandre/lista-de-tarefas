export type ExportTask = {
  description: string;
  status: string;
  date: string | null;
  project?: { name?: string } | null;
};

export type JsonExportData = {
  exportedAt: string;
  projects: unknown;
  tasks: unknown;
  notes: unknown;
  habits: unknown;
  focusLast7Days: unknown;
};

// prefixo ' neutraliza formula injection (=, +, -, @) em Excel/Sheets
export function escapeCsvCell(value: string): string {
  const escaped = `"${value.replace(/"/g, '""')}"`;
  return /^[=+\-@\t\r]/.test(escaped.replace(/^"/, '')) ? `'${escaped}` : escaped;
}

export function buildCsvExport(tasks: ExportTask[]): string {
  const header = 'description,status,date,project';
  const rows = tasks.map((t) =>
    [
      escapeCsvCell(t.description),
      t.status,
      t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
      escapeCsvCell(t.project?.name ?? ''),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function buildJsonExport(data: JsonExportData): string {
  return JSON.stringify(data, null, 2);
}
