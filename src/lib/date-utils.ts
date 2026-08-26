export function userDayKey(tzOffsetMinutes: number, base: Date = new Date()): string {
  const shifted = new Date(base.getTime() - tzOffsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function localDayKey(base: Date = new Date()): string {
  return userDayKey(base.getTimezoneOffset(), base);
}

export function userEndOfDay(tzOffsetMinutes: number, base: Date = new Date()): Date {
  const shifted = new Date(base.getTime() - tzOffsetMinutes * 60_000);
  shifted.setUTCHours(23, 59, 59, 999);
  return new Date(shifted.getTime() + tzOffsetMinutes * 60_000);
}

export function userEndOfWeek(tzOffsetMinutes: number, base: Date = new Date()): Date {
  const inAWeek = new Date(base);
  inAWeek.setDate(inAWeek.getDate() + 7);
  return userEndOfDay(tzOffsetMinutes, inAWeek);
}

export function parseTzParam(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const tz = Number(value);
  if (!Number.isFinite(tz) || tz < -840 || tz > 840) return null;
  return Math.round(tz);
}

export function isDateOnlyString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(`${value}T00:00:00Z`).getTime());
}
