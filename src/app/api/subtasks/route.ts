import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isCrossSite, crossSiteResponse } from "@/lib/http-guard";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function ownedTask(taskId: string, userId: string) {
  return prisma.list.findFirst({ where: { id: taskId, userId } });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthenticated user" }, { status: 401 });
    }
    if (!rateLimit(clientKey(request, "subtasks:create"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const body = await request.json();
    const taskId = String(body?.taskId ?? "");
    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 300) : "";

    if (!taskId || !description) {
      return NextResponse.json({ error: "taskId and description are mandatory" }, { status: 400 });
    }

    if (!(await ownedTask(taskId, session.user.id))) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const order = await prisma.subTask.count({ where: { taskId } });

    const subtask = await prisma.subTask.create({
      data: { description, taskId, order },
    });

    return NextResponse.json({ message: "Subtask added", subtask }, { status: 201 });
  } catch (error) {
    console.error("Error creating subtask:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthenticated user" }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body?.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "ID is mandatory" }, { status: 400 });
    }

    if (!rateLimit(clientKey(request, "subtasks:update"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const subtask = await prisma.subTask.findFirst({
      where: { id, task: { userId: session.user.id } },
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const updated = await prisma.subTask.update({
      where: { id },
      data: {
        ...(typeof body.done === "boolean" ? { done: body.done } : {}),
        ...(typeof body.description === "string" && body.description.trim()
          ? { description: body.description.trim().slice(0, 300) }
          : {}),
      },
    });

    return NextResponse.json({ message: "Subtask updated", subtask: updated });
  } catch (error) {
    console.error("Error updating subtask:", error);
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

    if (!rateLimit(clientKey(request, "subtasks:delete"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const deleted = await prisma.subTask.deleteMany({
      where: { id: String(id), task: { userId: session.user.id } },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Subtask deleted" });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
