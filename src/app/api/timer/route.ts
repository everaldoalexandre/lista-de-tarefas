import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated user" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: session.user.id,
      date: { gte: since },
      ...(projectId ? { projectId } : {}),
    },
    select: { minutes: true, date: true },
  });

  const byDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay[d.toISOString().slice(0, 10)] = 0;
  }

  let weekTotal = 0;
  for (const entry of entries) {
    const key = entry.date.toISOString().slice(0, 10);
    if (key in byDay) {
      byDay[key] += entry.minutes;
      weekTotal += entry.minutes;
    }
  }

  return NextResponse.json({ byDay, weekTotal });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return Response.json({ error: "Unauthenticated user" }, { status: 401 });
    }

    if (!rateLimit(clientKey(request, "timer:log"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const minutes = Number(body?.minutes);
    const projectId = typeof body?.projectId === "string" ? body.projectId : null;

    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      return NextResponse.json({ error: "Invalid minutes" }, { status: 400 });
    }

    const date = new Date();
    date.setHours(12, 0, 0, 0);

    await prisma.timeEntry.create({
      data: { minutes: Math.round(minutes), date, userId: session.user.id, projectId },
    });

    return NextResponse.json({ message: "Time logged" }, { status: 201 });
  } catch (error) {
    console.error("Error logging time:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
