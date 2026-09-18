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
      list: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      project: { findFirst: vi.fn() },
      $transaction: vi.fn(),
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

import { GET, POST, PUT, DELETE } from '@/app/api/tasks/route';
import { loggedIn, loggedOut, jsonRequest, prisma, row } from './mocks';

const list = vi.mocked(prisma.list);
const project = vi.mocked(prisma.project);

beforeEach(() => {
  vi.clearAllMocks();
  loggedIn();
});

describe('GET /api/tasks', () => {
  it('retorna 401 sem sessao', async () => {
    loggedOut();
    const res = await GET(new Request('http://test/api/tasks?all=1'));
    expect(res.status).toBe(401);
  });

  it('filtra pelo dono em todas as listagens', async () => {
    list.findMany.mockResolvedValue([]);
    const res = await GET(new Request('http://test/api/tasks?all=1'));
    expect(res.status).toBe(200);
    expect(list.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
    );
  });

  it('rejeita projectId malformado com 400 sem tocar o banco', async () => {
    const res = await GET(new Request('http://test/api/tasks?projectId=not-a-uuid'));
    expect(res.status).toBe(400);
    expect(list.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/tasks', () => {
  it('rejeita corpo invalido com 400', async () => {
    const res = await POST(jsonRequest('POST', {}));
    expect(res.status).toBe(400);
    expect(list.create).not.toHaveBeenCalled();
  });

  it('cria com userId da sessao e ordem sequencial', async () => {
    list.count.mockResolvedValue(2);
    list.create.mockResolvedValue(row({ id: 't1' }));
    const res = await POST(jsonRequest('POST', { newTask: { description: '  Buy milk  ' } }));
    expect(res.status).toBe(201);
    expect(list.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          description: 'Buy milk',
          status: 'pending',
          order: 3,
        }),
      })
    );
  });

  it('rejeita projeto de outro usuario com 404', async () => {
    project.findFirst.mockResolvedValue(null);
    const res = await POST(
      jsonRequest('POST', {
        newTask: { description: 'x', projectId: '123e4567-e89b-12d3-a456-426614174000' },
      })
    );
    expect(res.status).toBe(404);
    expect(list.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/tasks', () => {
  it('restaura apenas item deletado do dono', async () => {
    list.updateMany.mockResolvedValue({ count: 1 });
    const res = await PUT(jsonRequest('PUT', { id: 't1', restore: true }));
    expect(res.status).toBe(200);
    expect(list.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 't1', userId: 'user-1', deletedAt: { not: null } }),
      })
    );
  });

  it('restore de item alheio retorna 404', async () => {
    list.updateMany.mockResolvedValue({ count: 0 });
    const res = await PUT(jsonRequest('PUT', { id: 't1', restore: true }));
    expect(res.status).toBe(404);
  });

  it('update de tarefa alheia retorna 404 sem alterar', async () => {
    list.findFirst.mockResolvedValue(null);
    const res = await PUT(jsonRequest('PUT', { id: 't1', pinned: true }));
    expect(res.status).toBe(404);
    expect(list.update).not.toHaveBeenCalled();
  });

  it('reorder valida posse de todos os ids', async () => {
    list.count.mockResolvedValue(1);
    const res = await PUT(jsonRequest('PUT', { order: ['a', 'b'] }));
    expect(res.status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reorder persiste via transacao quando tudo pertence ao dono', async () => {
    list.count.mockResolvedValue(2);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    const res = await PUT(jsonRequest('PUT', { order: ['a', 'b'] }));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('concluir tarefa recorrente agenda a proxima ocorrencia', async () => {
    list.findFirst.mockResolvedValue(row({
      id: 't1',
      recurrence: 'daily',
      description: 'Gym',
      date: null,
      projectId: null,
    }));
    list.update.mockResolvedValue(row({ id: 't1' }));
    list.count.mockResolvedValue(0);
    list.create.mockResolvedValue(row({ id: 't2' }));
    const res = await PUT(jsonRequest('PUT', { id: 't1', status: 'completed' }));
    expect(res.status).toBe(200);
    expect(list.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending', recurrence: 'daily', userId: 'user-1' }),
      })
    );
  });
});

describe('DELETE /api/tasks', () => {
  it('soft delete move para a lixeira', async () => {
    list.updateMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(jsonRequest('DELETE', { id: 't1' }));
    expect(res.status).toBe(200);
    expect(list.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 't1', userId: 'user-1', deletedAt: null }),
      })
    );
  });

  it('purge exige item ja deletado do dono', async () => {
    list.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(jsonRequest('DELETE', { id: 't1', purge: true }));
    expect(res.status).toBe(200);
    expect(list.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 't1', userId: 'user-1', deletedAt: { not: null } }),
      })
    );
  });
});
