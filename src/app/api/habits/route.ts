import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isCrossSite, crossSiteResponse } from "@/lib/http-guard";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated user" }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 400);

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      logs: {
        where: { date: { gte: since } },
        select: { date: true },
      },
    },
  });

  return NextResponse.json({
    habits: habits.map(({ logs, ...habit }) => ({
      ...habit,
      doneDates: Array.from(new Set(logs.map((l) => l.date.toISOString().slice(0, 10)))),
    })),
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return Response.json({ error: "Unauthenticated user" }, { status: 401 });
    }

    if (!rateLimit(clientKey(request, "habits:create"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name || name.length > 60) {
      return NextResponse.json({ error: "Name is mandatory" }, { status: 400 });
    }

    const habit = await prisma.habit.create({
      data: { name, userId: session.user.id },
    });

    return NextResponse.json({ message: "Habit created", habit }, { status: 201 });
  } catch (error) {
    console.error("Error creating habit:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return Response.json({ error: "Unauthenticated user" }, { status: 401 });
    }

    if (!rateLimit(clientKey(request, "habits:toggle"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const { id, date } = await request.json();

    if (!id || !date) {
      return NextResponse.json({ error: "id and date are mandatory" }, { status: 400 });
    }

    const habit = await prisma.habit.findFirst({
      where: { id: String(id), userId: session.user.id },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const logDate = new Date(`${date}T00:00:00Z`);

    if (isNaN(logDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const existing = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId: habit.id, date: logDate } },
    });

    if (existing) {
      await prisma.habitLog.delete({ where: { id: existing.id } });
    } else {
      await prisma.habitLog.create({
        data: { habitId: habit.id, date: logDate },
      });
    }

    return NextResponse.json({ message: "Log updated" });
  } catch (error) {
    console.error("Error toggling habit log:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return Response.json({ error: "Unauthenticated user" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is mandatory" }, { status: 400 });
    }

    if (!rateLimit(clientKey(request, "habits:delete"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const deleted = await prisma.habit.deleteMany({
      where: { id: String(id), userId: session.user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Habit deleted" });
  } catch (error) {
    console.error("Error deleting habit:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
