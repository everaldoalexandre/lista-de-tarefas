import { vi } from 'vitest';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export function loggedIn(userId = 'user-1') {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: userId } } as never);
}

export function loggedOut() {
  vi.mocked(auth.api.getSession).mockResolvedValue(null);
}

export function jsonRequest(method: string, body?: unknown, url = 'http://test/api/x') {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// envolve valores parciais para os mocks do Prisma (os delegates reais
// exigiriam o modelo completo); mantem o typecheck util no lado das asserts
export function row(value: unknown): never {
  return value as never;
}

export function bodyOf<T>(res: unknown): T {
  return (res as { body: unknown }).body as T;
}

export { prisma };
