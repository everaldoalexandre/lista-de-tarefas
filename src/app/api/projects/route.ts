import { auth } from "@/lib/auth";
import { PrismaClient } from '@/generated/prisma';
import { headers } from "next/headers";
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

function isPrismaError(error: unknown): error is { code: string; message: string } {
  return error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error;
}

//GET

export async function GET() {
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

    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            list: { where: { status: 'pending' } }
          }
        }
      }
    });

    const projectsEnd = projects.map(({ _count, ...project }) => ({
      ...project,
      pendingCount: _count.list,
    }));

    return NextResponse.json({ projects: projectsEnd });
  } catch (error) {
    console.error('Error when searching for projects:', error);
    return NextResponse.json({ error: 'Error when searching for projects' }, { status: 500 });
  }
}

//POST

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name } = body;

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Unauthenticated user' },
        { status: 401 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is mandatory' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        userId: session.user.id
      }
    });

    return NextResponse.json({
      message: 'Project created successfully',
      project
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating project:', error);

    if (isPrismaError(error) && error.code === 'P2002') {
      return NextResponse.json({ error: 'Project already exists' }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Internal error creating project',
      details: process.env.NODE_ENV === 'development' && isPrismaError(error) ? error.message : undefined
    }, { status: 500 });
  }
}

//PUT

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const { id, name } = body;

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

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is mandatory' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: String(id),
        userId: session.user.id
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { name: name.trim() }
    });

    return NextResponse.json({
      message: 'Project updated successfully',
      project: updated
    });

  } catch (error) {
    console.error('Error updating project:', error);

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal error while updating project' }, { status: 500 });
  }
}

//DELETE

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

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

    const project = await prisma.project.findFirst({
      where: {
        id: String(id),
        userId: session.user.id
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id: project.id }
    });

    return NextResponse.json({ message: 'Project deleted successfully' });

  } catch (error) {
    console.error('Error deleting project:', error);

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal error while deleting project' }, { status: 500 });
  }
}
