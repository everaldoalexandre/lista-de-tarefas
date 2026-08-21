import { auth } from "@/lib/auth";
import { prisma, isPrismaError } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from 'next/server';

interface UpdateData {
  status?: string;
  description?: string;
  date?: Date | null;
  projectId?: string | null;
}

async function getSession() {
  return auth.api.getSession({
    headers: await headers()
  });
}

function unauthorized() {
  return Response.json(
    { error: 'Unauthenticated user' },
    { status: 401 }
  );
}

async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: String(projectId), userId }
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
    const projectId = searchParams.get('projectId');

    const list = await prisma.list.findMany({
      where: {
        userId: session.user.id,
        projectId: projectId || null
      },
      orderBy: { order: 'asc' }
    });

    const listEnd = list.map((task, index) => ({
      ...task,
      order: task.order ?? index,
    }));

    return NextResponse.json({ list: listEnd });
  } catch (error) {
    console.error('Error when searching for tasks:', error);
    return NextResponse.json({ error: 'Error when searching for tasks' }, { status: 500 });
  }
}

//POST

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return unauthorized();
    }

    const body = await request.json();

    const { newTask } = body;

    if (!newTask) {
      return NextResponse.json({ error: 'newTask is mandatory' }, { status: 400 });
    }

    if (!newTask.description || !newTask.description.trim()) {
      return NextResponse.json({ error: 'Description is mandatory' }, { status: 400 });
    }

    if (newTask.projectId && !(await assertProjectOwnership(newTask.projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let validDate: Date | null = null;
    if (newTask.date) {
      validDate = new Date(newTask.date);
      if (isNaN(validDate.getTime())) {
        return NextResponse.json({ error: 'invalid date' }, { status: 400 });
      }
    }

    const order = (await prisma.list.count({
      where: {
        userId: session.user.id,
        projectId: newTask.projectId || null
      }
    })) + 1;

    const task = await prisma.list.create({
      data: {
        status: 'pending',
        description: newTask.description.trim(),
        date: validDate,
        order,
        projectId: newTask.projectId || null,
        userId: session.user.id
      }
    });

    return NextResponse.json({
      message: 'Task added successfully',
      task
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating task:', error);

    if (isPrismaError(error) && error.code === 'P2002') {
      return NextResponse.json({ error: 'Task already exists' }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Internal error creating task',
      details: process.env.NODE_ENV === 'development' && isPrismaError(error) ? error.message : undefined
    }, { status: 500 });
  }
}

//DELETE

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return unauthorized();
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is mandatory' }, { status: 400 });
    }

    const deleted = await prisma.list.deleteMany({
      where: {
        id: String(id),
        userId: session.user.id
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Task deleted successfully' });

  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal error while deleting task' }, { status: 500 });
  }
}

//PUT

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return unauthorized();
    }

    const body = await request.json();

    if (Array.isArray(body.order)) {
      const { order } = body;

      if (order.length === 0) {
        return NextResponse.json({ message: 'Order updated successfully!' });
      }

      const ids = order.map(String);
      const ownedCount = await prisma.list.count({
        where: {
          id: { in: ids },
          userId: session.user.id
        }
      });

      if (ownedCount !== ids.length) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      await prisma.$transaction(
        ids.map((id: string, index: number) =>
          prisma.list.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      return NextResponse.json({ message: 'Order updated successfully!' });
    }

    const { id, status, description, date, projectId } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is mandatory' }, { status: 400 });
    }

    const updateData: UpdateData = {};

    if (status !== undefined) {
      if (status !== 'pending' && status !== 'completed') {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (description !== undefined) {
      if (!description.trim()) {
        return NextResponse.json({ error: 'Description cannot be empty' }, { status: 400 });
      }
      updateData.description = description.trim();
    }
    if (date !== undefined) {
      if (date === null || date === '') {
        updateData.date = null;
      } else {
        const validDate = new Date(date);
        if (isNaN(validDate.getTime())) {
          return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }
        updateData.date = validDate;
      }
    }
    if (projectId !== undefined) {
      if (projectId && !(await assertProjectOwnership(projectId, session.user.id))) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      updateData.projectId = projectId || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const existing = await prisma.list.findFirst({
      where: {
        id: String(id),
        userId: session.user.id
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = await prisma.list.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Task updated successfully',
      task
    });

  } catch (error) {
    console.error('Error updating task:', error);

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal error while updating task' }, { status: 500 });
  }
}
