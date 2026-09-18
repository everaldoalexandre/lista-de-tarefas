import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/auth')>();
  return { ...mod, auth: { api: { getSession: vi.fn() } } };
});

vi.mock('@/lib/prisma', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/prisma')>();
  return {
    ...mod,
    prisma: {
      list: { findFirst: vi.fn() },
      subTask: {
        count: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/rate-limit')>();
  return { ...mod, rateLimit: () => true };
});

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));

import { POST, PUT, DELETE } from '@/app/api/subtasks/route';
import { loggedIn, loggedOut, jsonRequest, prisma, row } from './mocks';

const list = vi.mocked(prisma.list);
const subTask = vi.mocked(prisma.subTask);

beforeEach(() => {
  vi.clearAllMocks();
  loggedIn();
});

describe('POST /api/subtasks', () => {
  it('retorna 401 sem sessao', async () => {
    loggedOut();
    expect((await POST(jsonRequest('POST', { taskId: 't', description: 'x' }))).status).toBe(401);
  });

  it('cria em tarefa do dono', async () => {
    list.findFirst.mockResolvedValue(row({ id: 't1' }));
    subTask.count.mockResolvedValue(0);
    subTask.create.mockResolvedValue(row({ id: 's1' }));
    const res = await POST(jsonRequest('POST', { taskId: 't1', description: 'step' }));
    expect(res.status).toBe(201);
    expect(subTask.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ taskId: 't1', description: 'step' }) })
    );
  });

  it('rejeita tarefa alheia com 404', async () => {
    list.findFirst.mockResolvedValue(null);
    const res = await POST(jsonRequest('POST', { taskId: 't9', description: 'step' }));
    expect(res.status).toBe(404);
    expect(subTask.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/subtasks', () => {
  it('atualiza subtask do dono', async () => {
    subTask.findFirst.mockResolvedValue(row({ id: 's1' }));
    subTask.update.mockResolvedValue(row({ id: 's1', done: true }));
    const res = await PUT(jsonRequest('PUT', { id: 's1', done: true }));
    expect(res.status).toBe(200);
  });

  it('rejeita subtask alheia com 404', async () => {
    subTask.findFirst.mockResolvedValue(null);
    const res = await PUT(jsonRequest('PUT', { id: 's9', done: true }));
    expect(res.status).toBe(404);
    expect(subTask.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/subtasks', () => {
  it('apaga subtask do dono', async () => {
    subTask.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(jsonRequest('DELETE', { id: 's1' }));
    expect(res.status).toBe(200);
    expect(subTask.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 's1', task: { userId: 'user-1' } }),
      })
    );
  });

  it('rejeita subtask alheia com 404', async () => {
    subTask.deleteMany.mockResolvedValue({ count: 0 });
    const res = await DELETE(jsonRequest('DELETE', { id: 's9' }));
    expect(res.status).toBe(404);
  });
});
