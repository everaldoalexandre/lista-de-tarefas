import prisma from "@/lib/prisma";
import { NextResponse } from 'next/server';

interface UpdateData {
  status?: string;
  descricao?: string;
  data?: Date;
}

function isPrismaError(error: unknown): error is { code: string; message: string } {
  return error !== null && 
         typeof error === 'object' && 
         'code' in error && 
         'message' in error;
}

export async function GET() {
  try {
    const lista = await prisma.lista.findMany();
    return NextResponse.json({lista});
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    return NextResponse.json({ error: 'Erro ao buscar tarefas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Body recebido:', body);
    
    const { novaTarefa } = body;
    
    if (!novaTarefa) {
      return NextResponse.json({ error: 'novaTarefa é obrigatório' }, { status: 400 });
    }
    
    if (!novaTarefa.descricao || !novaTarefa.descricao.trim()) {
      return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 400 });
    }
    
    if (!novaTarefa.data) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 });
    }

    const dataValida = new Date(novaTarefa.data);
    if (isNaN(dataValida.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }

    console.log('Criando tarefa:', {
      status: 'pendente',
      descricao: novaTarefa.descricao.trim(),
      data: dataValida
    });

    const tarefa = await prisma.lista.create({ 
      data: { 
        status: 'pendente', 
        descricao: novaTarefa.descricao.trim(), 
        data: dataValida
      }
    });

    return NextResponse.json({ 
      message: 'Tarefa adicionada com sucesso', 
      tarefa 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    
    if (isPrismaError(error) && error.code === 'P2002') {
      return NextResponse.json({ error: 'Tarefa já existe' }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Erro interno ao criar tarefa',
      details: process.env.NODE_ENV === 'development' && isPrismaError(error) ? error.message : undefined
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await prisma.lista.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: 'Tarefa deletada com sucesso' });
    
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error);
    
    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Erro interno ao deletar tarefa' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status, descricao, data } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const updateData: UpdateData = {};

    if (status !== undefined) updateData.status = status;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (data !== undefined) {
      const dataValida = new Date(data);
      if (isNaN(dataValida.getTime())) {
        return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
      }
      updateData.data = dataValida;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const tarefa = await prisma.lista.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({ 
      message: 'Tarefa atualizada com sucesso', 
      tarefa 
    });
    
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    
    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Erro interno ao atualizar tarefa' }, { status: 500 });
  }
}