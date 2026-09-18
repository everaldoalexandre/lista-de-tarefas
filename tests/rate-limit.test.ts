import { describe, it, expect } from 'vitest';
import { clientKey, rateLimit } from '@/lib/rate-limit';

function req(headers: Record<string, string>) {
  return new Request('https://app.test/api/tasks', { method: 'POST', headers: new Headers(headers) });
}

describe('clientKey', () => {
  it('prefere x-real-ip (definido pelo edge) ao XFF', () => {
    const r = req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'x-real-ip': '9.9.9.9' });
    expect(clientKey(r, 'tasks:create')).toBe('tasks:create:9.9.9.9');
  });

  it('usa a ultima entrada do XFF (prefixo e forjavel pelo cliente)', () => {
    const r = req({ 'x-forwarded-for': 'fake-1, fake-2, 5.6.7.8' });
    expect(clientKey(r, 'tasks:create')).toBe('tasks:create:5.6.7.8');
  });

  it('retorna unknown sem nenhum cabecalho de IP', () => {
    expect(clientKey(req({}), 'tasks:create')).toBe('tasks:create:unknown');
  });
});

describe('rateLimit', () => {
  it('bloqueia apos o limite e libera em outra chave', () => {
    const key = `test:${Date.now()}:a`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
    expect(rateLimit(`${key}:outra`, 3, 60_000)).toBe(true);
  });
});
