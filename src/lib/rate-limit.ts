const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();

  if (buckets.size >= MAX_KEYS) {
    sweep(now, windowMs);
  }

  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

function sweep(now: number, windowMs: number) {
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => now - t < windowMs);
    if (fresh.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, fresh);
    }
    if (buckets.size < MAX_KEYS * 0.8) break;
  }
}

export function clientKey(request: Request, scope: string) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  return `${scope}:${ip}`;
}
