import { auth } from "@/lib/auth";
import { prisma, isPrismaError } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { noteCreateSchema, noteUpdateSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { NextResponse } from 'next/server';

//GET

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Unauthenticated user' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trash = searchParams.get("trash") === "1";
    const taskId = searchParams.get("taskId");
    const projectId = searchParams.get("projectId");
    const q = searchParams.get("q");

    const notes = await prisma.note.findMany({
      where: {
        userId: session.user.id,
        deletedAt: trash ? { not: null } : null,
        ...(taskId ? { taskId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { content: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [
        { pinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        task: { select: { id: true, description: true } },
        project: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error when searching for notes:', error);
    return NextResponse.json({ error: 'Error when searching for notes' }, { status: 500 });
  }
}

//POST

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Unauthenticated user' },
        { status: 401 }
      );
    }

    if (!rateLimit(clientKey(request, "notes:create"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = noteCreateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: 'Title is mandatory' }, { status: 400 });
    }

    const { title, content, taskId, projectId } = parsed.data;

    if (taskId) {
      const taskExists = await prisma.list.count({
        where: { id: taskId, userId: session.user.id }
      });

      if (taskExists === 0) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
    }

    if (projectId) {
      const projectExists = await prisma.project.count({
        where: { id: projectId, userId: session.user.id }
      });

      if (projectExists === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    const note = await prisma.note.create({
      data: {
        title,
        content: content ?? '',
        userId: session.user.id,
        ...(taskId ? { taskId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: {
        task: { select: { id: true, description: true } },
        project: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({
      message: 'Note created successfully',
      note
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating note:', error);

    if (isPrismaError(error) && error.code === 'P2003') {
      return NextResponse.json({ error: 'Linked task or project not found' }, { status: 404 });
    }

    return NextResponse.json({
      error: 'Internal error creating note',
      details: process.env.NODE_ENV === 'development' && isPrismaError(error) ? error.message : undefined
    }, { status: 500 });
  }
}

//PUT

export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Unauthenticated user' },
        { status: 401 }
      );
    }

    if (!rateLimit(clientKey(request, "notes:update"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: 'ID is mandatory' }, { status: 400 });
    }

    if (body.restore === true) {
      const restored = await prisma.note.updateMany({
        where: { id: String(body.id), userId: session.user.id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      if (restored.count === 0) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Note restored' });
    }

    const parsed = noteUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { id, title, content, pinned, taskId, projectId } = parsed.data;

    const note = await prisma.note.findFirst({
      where: {
        id: String(id),
        userId: session.user.id
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (taskId !== undefined && taskId !== null) {
      const taskExists = await prisma.list.count({
        where: { id: taskId, userId: session.user.id }
      });

      if (taskExists === 0) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
    }

    if (projectId !== undefined && projectId !== null) {
      const projectExists = await prisma.project.count({
        where: { id: projectId, userId: session.user.id }
      });

      if (projectExists === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    const updated = await prisma.note.update({
      where: { id: note.id },
      data: {
        ...(title ? { title } : {}),
        ...(content !== undefined ? { content: content ?? '' } : {}),
        ...(pinned !== undefined ? { pinned } : {}),
        ...(taskId !== undefined ? { taskId } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
      },
      include: {
        task: { select: { id: true, description: true } },
        project: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({
      message: 'Note updated successfully',
      note: updated
    });

  } catch (error) {
    console.error('Error updating note:', error);

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal error while updating note' }, { status: 500 });
  }
}

//DELETE

export async function DELETE(request: Request) {
  try {
    const { id, purge } = await request.json();

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Unauthenticated user' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is mandatory' }, { status: 400 });
    }

    if (!rateLimit(clientKey(request, "notes:delete"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (purge === true) {
      const purged = await prisma.note.deleteMany({
        where: {
          id: String(id),
          userId: session.user.id,
          deletedAt: { not: null }
        }
      });

      if (purged.count === 0) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Note permanently deleted' });
    }

    const deleted = await prisma.note.updateMany({
      where: {
        id: String(id),
        userId: session.user.id,
        deletedAt: null
      },
      data: { deletedAt: new Date() }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note moved to trash' });

  } catch (error) {
    console.error('Error deleting note:', error);

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal error while deleting note' }, { status: 500 });
  }
}
