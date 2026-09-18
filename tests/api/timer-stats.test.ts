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
      timeEntry: { findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
      project: { findFirst: vi.fn() },
      list: { count: vi.fn() },
      habitLog: { count: vi.fn() },
      habit: { findMany: vi.fn() },
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

import { GET as timerGet, POST as timerPost } from '@/app/api/timer/route';
import { GET as statsGet } from '@/app/api/stats/route';
import { loggedIn, loggedOut, jsonRequest, prisma, row, bodyOf } from './mocks';

const timeEntry = vi.mocked(prisma.timeEntry);
const project = vi.mocked(prisma.project);

beforeEach(() => {
  vi.clearAllMocks();
  loggedIn();
});

describe('POST /api/timer', () => {
  it('retorna 401 sem sessao', async () => {
    loggedOut();
    expect((await timerPost(jsonRequest('POST', { minutes: 25 }))).status).toBe(401);
  });

  it('rejeita minutos invalidos', async () => {
    for (const minutes of [0, -5, 999, Number.NaN]) {
      const res = await timerPost(jsonRequest('POST', { minutes }));
      expect(res.status).toBe(400);
    }
    expect(timeEntry.create).not.toHaveBeenCalled();
  });

  it('rejeita projeto alheio e id malformado', async () => {
    project.findFirst.mockResolvedValue(null);
    const foreign = await timerPost(
      jsonRequest('POST', { minutes: 25, projectId: '123e4567-e89b-12d3-a456-426614174000' })
    );
    expect(foreign.status).toBe(404);

    const malformed = await timerPost(jsonRequest('POST', { minutes: 25, projectId: 'xxx' }));
    expect(malformed.status).toBe(400);
    expect(timeEntry.create).not.toHaveBeenCalled();
  });

  it('registra com userId da sessao', async () => {
    timeEntry.create.mockResolvedValue(row({ id: 'e1' }));
    const res = await timerPost(jsonRequest('POST', { minutes: 25, date: '2026-09-18' }));
    expect(res.status).toBe(201);
    expect(timeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ minutes: 25, userId: 'user-1', projectId: null }),
      })
    );
  });
});

describe('GET /api/timer', () => {
  it('agrega apenas entradas do dono', async () => {
    timeEntry.findMany.mockResolvedValue([]);
    const res = await timerGet(new Request('http://test/api/timer'));
    expect(res.status).toBe(200);
    expect(timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
    );
  });
});

describe('GET /api/stats', () => {
  it('calcula XP a partir dos dados do dono', async () => {
    vi.mocked(prisma.list.count).mockResolvedValue(5);
    vi.mocked(prisma.habitLog.count).mockResolvedValue(3);
    timeEntry.aggregate.mockResolvedValue(row({ _sum: { minutes: 50 } }));
    vi.mocked(prisma.habit.findMany).mockResolvedValue(row([
      { logs: [{ date: new Date('2026-09-17T00:00:00Z') }, { date: new Date('2026-09-18T00:00:00Z') }] },
    ]));
    const res = await statsGet();
    expect(res.status).toBe(200);
    const body = bodyOf<{ xp: number; stats: { focusMinutes: number; bestStreak: number } }>(res);
    expect(body.xp).toBe(5 * 15 + 3 * 10 + Math.floor(50 / 25) * 20);
    expect(body.stats.focusMinutes).toBe(50);
    expect(body.stats.bestStreak).toBe(2);
  });
});
