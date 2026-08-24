import { auth } from "@/lib/auth";
import { prisma, isPrismaError } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  reorderSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from "@/lib/validation";
import { nextOccurrence, type Recurrence } from "@/lib/task-utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface UpdateData {
  status?: string;
  description?: string;
  date?: Date | null;
  recurrence?: string | null;
  priority?: string | null;
  pinned?: boolean;
  tags?: string[];
  projectId?: string | null;
}

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

function unauthorized() {
  return Response.json({ error: "Unauthenticated user" }, { status: 401 });
}

function invalid(errors: unknown) {
  return NextResponse.json(
    { error: "Invalid request body", details: errors },
    { status: 400 }
  );
}

function limited(request: Request, scope: string) {
  return !rateLimit(clientKey(request, scope));
}

async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: String(projectId), userId },
  });
  return project !== null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const range = searchParams.get("range");
    const all = searchParams.get("all") === "1";
    const trash = searchParams.get("trash") === "1";

    const where = {
      userId: session.user.id,
      deletedAt: trash ? { not: null } : null,
      ...(all ? {} : { projectId: projectId || null }),
      ...(range === "today"
        ? { status: "pending", date: { lte: endOfToday() } }
        : {}),
      ...(range === "week" ? { status: "pending", date: { lte: endOfWeek() } } : {}),
    };

    const list = await prisma.list.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        ...(all ? { project: true } : {}),
        subtasks: { orderBy: { order: "asc" } },
      },
    });

    const listEnd = list.map((task, index) => ({
      ...task,
      order: task.order ?? index,
    }));

    return NextResponse.json({ list: listEnd });
  } catch (error) {
    console.error("Error when searching for tasks:", error);
    return NextResponse.json(
      { error: "Error when searching for tasks" },
      { status: 500 }
    );
  }
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function endOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return unauthorized();
    }

    if (limited(request, "tasks:create")) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = taskCreateSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error.flatten());

    const newTask = parsed.data.newTask;

    if (
      newTask.projectId &&
      !(await assertProjectOwnership(newTask.projectId, session.user.id))
    ) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let validDate: Date | null = null;
    if (newTask.date) {
      validDate = new Date(newTask.date);
      if (isNaN(validDate.getTime())) {
        return NextResponse.json({ error: "invalid date" }, { status: 400 });
      }
    }

    const order =
      (await prisma.list.count({
        where: {
          userId: session.user.id,
          projectId: newTask.projectId || null,
        },
      })) + 1;

    const task = await prisma.list.create({
      data: {
        status: "pending",
        description: newTask.description.trim(),
        date: validDate,
        recurrence:
          newTask.recurrence && newTask.recurrence !== "none"
            ? newTask.recurrence
            : null,
        priority: newTask.priority ?? null,
        tags: newTask.tags ?? [],
        order,
        projectId: newTask.projectId || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: "Task added successfully", task },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating task:", error);

    if (isPrismaError(error) && error.code === "P2002") {
      return NextResponse.json({ error: "Task already exists" }, { status: 409 });
    }

    return NextResponse.json(
      {
        error: "Internal error creating task",
        details:
          process.env.NODE_ENV === "development" && isPrismaError(error)
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return unauthorized();
    }

    if (limited(request, "tasks:delete")) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is mandatory" }, { status: 400 });
    }

    if (body.purge === true) {
      const purged = await prisma.list.deleteMany({
        where: { id: String(id), userId: session.user.id, deletedAt: { not: null } },
      });
      if (purged.count === 0) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "Task permanently deleted" });
    }

    const deleted = await prisma.list.updateMany({
      where: { id: String(id), userId: session.user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task moved to trash" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal error while deleting task" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return unauthorized();
    }

    if (limited(request, "tasks:update")) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();

    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is mandatory" }, { status: 400 });
    }

    if (body.restore === true) {
      const restored = await prisma.list.updateMany({
        where: { id: String(id), userId: session.user.id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
      if (restored.count === 0) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "Task restored" });
    }

    if (body.purge === true) {
      await prisma.list.deleteMany({
        where: { id: String(id), userId: session.user.id, deletedAt: { not: null } },
      });
      return NextResponse.json({ message: "Task permanently deleted" });
    }

    const reorderParsed = reorderSchema.safeParse(body);
    if (reorderParsed.success) {
      const ids = reorderParsed.data.order;
      const ownedCount = await prisma.list.count({
        where: { id: { in: ids }, userId: session.user.id },
      });

      if (ownedCount !== ids.length) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.list.update({ where: { id }, data: { order: index } })
        )
      );

      return NextResponse.json({ message: "Order updated successfully!" });
    }

    const updateParsed = taskUpdateSchema.safeParse(body);
    if (!updateParsed.success) return invalid(updateParsed.error.flatten());

    const { status, description, date, projectId, recurrence, priority, pinned, tags } = updateParsed.data;

    const updateData: UpdateData = {};

    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description.trim();
    if (date !== undefined) {
      if (date === null || date === "") {
        updateData.date = null;
      } else {
        const validDate = new Date(date);
        if (isNaN(validDate.getTime())) {
          return NextResponse.json({ error: "Invalid date" }, { status: 400 });
        }
        updateData.date = validDate;
      }
    }
    if (projectId !== undefined) {
      if (projectId && !(await assertProjectOwnership(projectId, session.user.id))) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      updateData.projectId = projectId || null;
    }
    if (recurrence !== undefined) {
      updateData.recurrence = recurrence && recurrence !== "none" ? recurrence : null;
    }
    if (priority !== undefined) updateData.priority = priority ?? null;
    if (pinned !== undefined) updateData.pinned = pinned;
    if (tags !== undefined) updateData.tags = tags;

    const existing = await prisma.list.findFirst({
      where: { id: String(id), userId: session.user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = await prisma.list.update({
      where: { id: existing.id },
      data: updateData,
    });

    if (
      status === "completed" &&
      existing.recurrence &&
      ["daily", "weekly", "monthly"].includes(existing.recurrence)
    ) {
      const order =
        (await prisma.list.count({
          where: { userId: session.user.id, projectId: existing.projectId },
        })) + 1;

      await prisma.list.create({
        data: {
          status: "pending",
          description: existing.description,
          date: nextOccurrence(existing.date, existing.recurrence as Recurrence),
          recurrence: existing.recurrence,
          order,
          projectId: existing.projectId,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Error updating task:", error);

    if (isPrismaError(error) && error.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Internal error while updating task" },
      { status: 500 }
    );
  }
}
