import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isCrossSite, crossSiteResponse } from "@/lib/http-guard";
import { isDateOnlyString, parseTzParam, userDayKey } from "@/lib/date-utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated user" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const tz = parseTzParam(searchParams.get("tz")) ?? 0;

  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(userDayKey(tz, d));
  }
  const since = new Date(`${days[0]}T00:00:00Z`);

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: session.user.id,
      date: { gte: since },
      ...(projectId ? { projectId } : {}),
    },
    select: { minutes: true, date: true },
  });

  const byDay: Record<string, number> = {};
  for (const day of days) byDay[day] = 0;

  let weekTotal = 0;
  for (const entry of entries) {
    // entries são gravados com a parte de data já no fuso do cliente
    const key = entry.date.toISOString().slice(0, 10);
    if (key in byDay) {
      byDay[key] += entry.minutes;
      weekTotal += entry.minutes;
    }
  }

  return NextResponse.json({ byDay, weekTotal });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return Response.json({ error: "Unauthenticated user" }, { status: 401 });
    }

    if (!rateLimit(clientKey(request, "timer:log"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const body = await request.json();
    const minutes = Number(body?.minutes);
    const rawProjectId = typeof body?.projectId === "string" ? body.projectId : null;

    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      return NextResponse.json({ error: "Invalid minutes" }, { status: 400 });
    }

    let projectId: string | null = null;
    if (rawProjectId) {
      if (!UUID_RE.test(rawProjectId)) {
        return NextResponse.json({ error: "Invalid project" }, { status: 400 });
      }
      const owned = await prisma.project.findFirst({
        where: { id: rawProjectId, userId: session.user.id },
      });
      if (!owned) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      projectId = rawProjectId;
    }

    const dateOnly = isDateOnlyString(body?.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);

    const date = new Date(`${dateOnly}T12:00:00Z`);

    await prisma.timeEntry.create({
      data: { minutes: Math.round(minutes), date, userId: session.user.id, projectId },
    });

    return NextResponse.json({ message: "Time logged" }, { status: 201 });
  } catch (error) {
    console.error("Error logging time:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
