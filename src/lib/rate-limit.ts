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
  // x-real-ip e definido pelo edge (Vercel) e e autoritativo; no X-Forwarded-For
  // so a ultima entrada e confiavel (proxies acrescentam a direita, o cliente
  // controla o prefixo esquerdo). Nunca usar a primeira entrada.
  const forwarded = request.headers.get('x-forwarded-for');
  const lastForwarded = forwarded?.split(',').map((s) => s.trim()).filter(Boolean).pop();
  const ip =
    request.headers.get('x-real-ip')?.trim() ||
    lastForwarded ||
    'unknown';
  return `${scope}:${ip}`;
}
