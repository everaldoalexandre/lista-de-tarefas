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
      project: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
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

import { GET, POST, PUT, DELETE } from '@/app/api/projects/route';
import { loggedIn, loggedOut, jsonRequest, prisma, row } from './mocks';

const project = vi.mocked(prisma.project);

beforeEach(() => {
  vi.clearAllMocks();
  loggedIn();
});

describe('GET /api/projects', () => {
  it('retorna 401 sem sessao', async () => {
    loggedOut();
    expect((await GET(new Request('http://test/api/projects'))).status).toBe(401);
  });

  it('lista apenas projetos do dono', async () => {
    project.findMany.mockResolvedValue([]);
    const res = await GET(new Request('http://test/api/projects'));
    expect(res.status).toBe(200);
    expect(project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
    );
  });
});

describe('POST /api/projects', () => {
  it('cria com userId da sessao', async () => {
    project.create.mockResolvedValue(row({ id: 'p1' }));
    const res = await POST(jsonRequest('POST', { name: 'Work', type: 'work' }));
    expect(res.status).toBe(201);
    expect(project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Work', userId: 'user-1' }) })
    );
  });

  it('rejeita nome vazio', async () => {
    const res = await POST(jsonRequest('POST', { name: '  ' }));
    expect(res.status).toBe(400);
    expect(project.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/projects', () => {
  it('restaura item deletado do dono', async () => {
    project.updateMany.mockResolvedValue({ count: 1 });
    const res = await PUT(jsonRequest('PUT', { id: 'p1', restore: true }));
    expect(res.status).toBe(200);
    expect(project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'p1', userId: 'user-1', deletedAt: { not: null } }),
      })
    );
  });

  it('atualizar projeto alheio retorna 404 sem alterar', async () => {
    project.findFirst.mockResolvedValue(null);
    const res = await PUT(jsonRequest('PUT', { id: 'p1', name: 'X' }));
    expect(res.status).toBe(404);
    expect(project.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/projects', () => {
  it('purge exige item deletado do dono', async () => {
    project.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(jsonRequest('DELETE', { id: 'p1', purge: true }));
    expect(res.status).toBe(200);
    expect(project.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'p1', userId: 'user-1', deletedAt: { not: null } }),
      })
    );
  });

  it('soft delete move para a lixeira', async () => {
    project.findFirst.mockResolvedValue(row({ id: 'p1' }));
    project.update.mockResolvedValue(row({ id: 'p1' }));
    const res = await DELETE(jsonRequest('DELETE', { id: 'p1' }));
    expect(res.status).toBe(200);
    expect(project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    );
  });
});
