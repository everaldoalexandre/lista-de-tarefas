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
      habit: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
      },
      habitLog: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
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

import { Prisma } from '@/generated/prisma';
import { GET, POST, PUT, DELETE } from '@/app/api/habits/route';
import { loggedIn, loggedOut, jsonRequest, prisma, row } from './mocks';

const habit = vi.mocked(prisma.habit);
const habitLog = vi.mocked(prisma.habitLog);

beforeEach(() => {
  vi.clearAllMocks();
  loggedIn();
});

describe('GET /api/habits', () => {
  it('retorna 401 sem sessao', async () => {
    loggedOut();
    expect((await GET()).status).toBe(401);
  });

  it('lista apenas habitos do dono', async () => {
    habit.findMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(habit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
    );
  });
});

describe('PUT /api/habits (toggle)', () => {
  it('marca dia ausente', async () => {
    habit.findFirst.mockResolvedValue(row({ id: 'h1' }));
    habitLog.findUnique.mockResolvedValue(row(null));
    habitLog.create.mockResolvedValue(row({ id: 'l1' }));
    const res = await PUT(jsonRequest('PUT', { id: 'h1', date: '2026-09-18' }));
    expect(res.status).toBe(200);
    expect(habitLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ habitId: 'h1' }) })
    );
  });

  it('desmarca dia presente de forma idempotente', async () => {
    habit.findFirst.mockResolvedValue(row({ id: 'h1' }));
    habitLog.findUnique.mockResolvedValue(row({ id: 'l1' }));
    habitLog.deleteMany.mockResolvedValue({ count: 1 });
    const res = await PUT(jsonRequest('PUT', { id: 'h1', date: '2026-09-18' }));
    expect(res.status).toBe(200);
    expect(habitLog.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ habitId: 'h1' }) })
    );
  });

  it('criacao concorrente nao falha (P2002 vira sucesso)', async () => {
    habit.findFirst.mockResolvedValue(row({ id: 'h1' }));
    habitLog.findUnique.mockResolvedValue(row(null));
    habitLog.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      })
    );
    const res = await PUT(jsonRequest('PUT', { id: 'h1', date: '2026-09-18' }));
    expect(res.status).toBe(200);
  });

  it('rejeita habito alheio com 404', async () => {
    habit.findFirst.mockResolvedValue(null);
    const res = await PUT(jsonRequest('PUT', { id: 'h9', date: '2026-09-18' }));
    expect(res.status).toBe(404);
    expect(habitLog.create).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/habits', () => {
  it('apaga habito do dono', async () => {
    habit.deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(jsonRequest('DELETE', { id: 'h1' }));
    expect(res.status).toBe(200);
    expect(habit.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'h1', userId: 'user-1' }) })
    );
  });
});

describe('POST /api/habits', () => {
  it('cria com userId da sessao', async () => {
    habit.create.mockResolvedValue(row({ id: 'h1' }));
    const res = await POST(jsonRequest('POST', { name: 'Read' }));
    expect(res.status).toBe(201);
    expect(habit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Read', userId: 'user-1' }) })
    );
  });
});
