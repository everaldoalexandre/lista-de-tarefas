import { describe, it, expect } from 'vitest';
import { isCrossSite } from '@/lib/http-guard';

function req(origin: string | null, host: string | null, forwardedHost?: string) {
  const headers = new Headers();
  if (origin) headers.set('origin', origin);
  if (host) headers.set('host', host);
  if (forwardedHost) headers.set('x-forwarded-host', forwardedHost);
  return new Request('https://app.test/api/tasks', { method: 'POST', headers });
}

describe('isCrossSite', () => {
  it('permite requisição sem Origin (curl, server-to-server, same-origin GET)', () => {
    expect(isCrossSite(req(null, 'app.test'))).toBe(false);
  });

  it('permite mesma origem', () => {
    expect(isCrossSite(req('https://app.test', 'app.test'))).toBe(false);
  });

  it('bloqueia origem diferente do host', () => {
    expect(isCrossSite(req('https://evil.test', 'app.test'))).toBe(true);
  });

  it('usa x-forwarded-host atrás de proxy', () => {
    expect(isCrossSite(req('https://app.test', 'internal:3000', 'app.test'))).toBe(false);
    expect(isCrossSite(req('https://evil.test', 'internal:3000', 'app.test'))).toBe(true);
  });

  it('bloqueia Origin malformada', () => {
    expect(isCrossSite(req('not-a-url', 'app.test'))).toBe(true);
  });
});
