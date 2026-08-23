export const PROJECT_TYPES = [
  { key: 'general', label: 'General' },
  { key: 'study', label: 'Study' },
  { key: 'work', label: 'Work' },
  { key: 'personal', label: 'Personal' },
] as const;

export type ProjectTypeKey = (typeof PROJECT_TYPES)[number]['key'];

export function projectTypeLabel(key: string) {
  return PROJECT_TYPES.find((t) => t.key === key)?.label ?? 'General';
}
