import { auth } from "@/lib/auth";
import { prisma, isPrismaError } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isCrossSite, crossSiteResponse } from "@/lib/http-guard";
import { projectCreateSchema, projectUpdateSchema } from "@/lib/validation";
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

    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
        deletedAt: trash ? { not: null } : null,
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
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Unauthenticated user' },
        { status: 401 }
      );
    }

    if (!rateLimit(clientKey(request, "projects:create"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const parsed = projectCreateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: 'Name is mandatory' }, { status: 400 });
    }

    const { name, type } = parsed.data;

    const project = await prisma.project.create({
      data: {
        name,
        type: type ?? 'general',
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
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return Response.json(
        { error: 'Unauthenticated user' },
        { status: 401 }
      );
    }

    if (!rateLimit(clientKey(request, "projects:update"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: 'ID is mandatory' }, { status: 400 });
    }

    if (body.restore === true) {
      const restored = await prisma.project.updateMany({
        where: { id: String(body.id), userId: session.user.id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      if (restored.count === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Project restored' });
    }

    const parsed = projectUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'ID is mandatory' }, { status: 400 });
    }

    const { id, name, pinned, type } = parsed.data;

    const project = await prisma.project.findFirst({
      where: {
        id: String(id),
        userId: session.user.id
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!name && pinned === undefined && type === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        ...(name ? { name } : {}),
        ...(pinned !== undefined ? { pinned } : {}),
        ...(type ? { type } : {}),
      }
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

    if (!rateLimit(clientKey(request, "projects:delete"))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (isCrossSite(request)) {
      return crossSiteResponse();
    }

    if (purge === true) {
      await prisma.project.deleteMany({
        where: {
          id: String(id),
          userId: session.user.id,
          deletedAt: { not: null }
        }
      });

      return NextResponse.json({ message: 'Project permanently deleted' });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: String(id),
        userId: session.user.id,
        deletedAt: null
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ message: 'Project moved to trash' });

  } catch (error) {
    console.error('Error deleting project:', error);

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal error while deleting project' }, { status: 500 });
  }
}
