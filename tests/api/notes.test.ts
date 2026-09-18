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
      note: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      list: { count: vi.fn() },
      project: { count: vi.fn() },
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

import { GET, POST, PUT, DELETE } from '@/app/api/notes/route';
import { loggedIn, loggedOut, jsonRequest, prisma, row, bodyOf } from './mocks';

const note = vi.mocked(prisma.note);
const list = vi.mocked(prisma.list);

beforeEach(() => {
  vi.clearAllMocks();
  loggedIn();
});

describe('GET /api/notes', () => {
  it('retorna 401 sem sessao', async () => {
    loggedOut();
    expect((await GET(new Request('http://test/api/notes'))).status).toBe(401);
  });

  it('filtra pelo dono', async () => {
    note.findMany.mockResolvedValue([]);
    const res = await GET(new Request('http://test/api/notes'));
    expect(res.status).toBe(200);
    expect(note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
    );
  });

  it('oculta vinculos que estao na lixeira', async () => {
    note.findMany.mockResolvedValue(row([
      {
        id: 'n1',
        task: { id: 't1', description: 'gone', deletedAt: new Date() },
        project: { id: 'p1', name: 'Alive', deletedAt: null },
      },
    ]));
    const res = await GET(new Request('http://test/api/notes'));
    expect(res.status).toBe(200);
    const notes = bodyOf<{ notes: { task: unknown; project: unknown }[] }>(res).notes;
    expect(notes[0].task).toBeNull();
    expect(notes[0].project).toEqual({ id: 'p1', name: 'Alive' });
  });

  it('rejeita taskId malformado com 400', async () => {
    const res = await GET(new Request('http://test/api/notes?taskId=xxx'));
    expect(res.status).toBe(400);
    expect(note.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/notes', () => {
  it('cria com userId da sessao', async () => {
    note.create.mockResolvedValue(row({ id: 'n1' }));
    const res = await POST(jsonRequest('POST', { title: 'Idea', content: 'x' }));
    expect(res.status).toBe(201);
    expect(note.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'Idea', userId: 'user-1' }) })
    );
  });

  it('rejeita vinculo com tarefa alheia', async () => {
    list.count.mockResolvedValue(0);
    const res = await POST(
      jsonRequest('POST', { title: 'x', taskId: '123e4567-e89b-12d3-a456-426614174000' })
    );
    expect(res.status).toBe(404);
    expect(note.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/notes', () => {
  it('atualizar nota alheia retorna 404', async () => {
    note.findFirst.mockResolvedValue(null);
    const res = await PUT(jsonRequest('PUT', { id: 'n1', title: 'x' }));
    expect(res.status).toBe(404);
    expect(note.update).not.toHaveBeenCalled();
  });

  it('restaura item deletado do dono', async () => {
    note.updateMany.mockResolvedValue({ count: 1 });
    const res = await PUT(jsonRequest('PUT', { id: 'n1', restore: true }));
    expect(res.status).toBe(200);
    expect(note.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'n1', userId: 'user-1', deletedAt: { not: null } }),
      })
    );
  });
});

describe('DELETE /api/notes', () => {
  it('soft delete e purge respeitam o dono', async () => {
    note.updateMany.mockResolvedValue({ count: 1 });
    const soft = await DELETE(jsonRequest('DELETE', { id: 'n1' }));
    expect(soft.status).toBe(200);

    note.deleteMany.mockResolvedValue({ count: 1 });
    const purge = await DELETE(jsonRequest('DELETE', { id: 'n1', purge: true }));
    expect(purge.status).toBe(200);
    expect(note.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'n1', userId: 'user-1', deletedAt: { not: null } }),
      })
    );
  });
});
