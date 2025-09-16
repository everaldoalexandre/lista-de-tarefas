import { auth } from "@/lib/auth";
import { PrismaClient } from '@/generated/prisma';
import { headers } from "next/headers";
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();


interface UpdateData {
  status?: string;
  description?: string;
  date?: Date;
  order?: number;
  userId?: string;
}

function isPrismaError(error: unknown): error is { code: string; message: string } {
  return error !== null && 
         typeof error === 'object' && 
         'code' in error && 
         'message' in error;
}

export async function GET() {

  try {

    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return Response.json(
        {error: 'Unauthenticated user'},
        {status: 401}
      )
    }

    const list = await prisma.list.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {order: 'asc'}
    });

    const listEnd = list.map((task, index) => ({
      ...task,
      order: task.order ?? index,
    }));

    return NextResponse.json({list: listEnd});
  } catch (error) {
    console.error('Error when searching for tasks:', error);
    return NextResponse.json({ error: 'Error when searching for tasks' }, { status: 500 });
  }
}

//POST

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { newTask } = body;

    const session = await auth.api.getSession({
      headers: await headers()
    })

    if (!session?.user) {
      return Response.json(
        {error: 'Unauthenticated user'},
        {status: 401}
      )
    }
    
    if (!newTask) {
      return NextResponse.json({ error: 'newTask is mandatory' }, { status: 400 });
    }

    if (!newTask.description || !newTask.description.trim()) {
      return NextResponse.json({ error: 'Description is mandatory' }, { status: 400 });
    }

    if (!newTask.date) {
      return NextResponse.json({ error: 'Date is mandatory' }, { status: 400 });
    }

    const validDate = new Date(newTask.date);
    if (isNaN(validDate.getTime())) {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }

    const task = await prisma.list.create({ 
      data: { 
        status: 'pending', 
        description: newTask.description.trim(), 
        date: validDate,
        order: await prisma.list.count(),
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
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is mandatory' }, { status: 400 });
    }

    await prisma.list.delete({
      where: { id: String(id) },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting task:', error);
    
    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal error while deleting task' }, { status: 500 });
  }
}

//PUT

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (body.order && Array.isArray(body.order)){
      const {order} = body;

      await Promise.all(
        order.map((id:string, index: number) => 
          prisma.list.update({
            where: {id},
            data: {order: index},
          })
        )
      );
      return NextResponse.json({message: 'Order updated successfully!'});
    }

    const { id, status, description, date } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is mandatory' }, { status: 400 });
    }

    const updateData: UpdateData = {};

    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) {
      const validDate = new Date(date);
      if (isNaN(validDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      updateData.date = validDate;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const task = await prisma.list.update({
      where: { id: String(id) },
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