import prisma from "@/lib/prisma";


export async function GET() {
  const lista = await prisma.lista.findMany();
  return Response.json({lista})
}

export async function POST(request: Request) {
  const { novaTarefa } = await request.json();
  const tarefa = await prisma.lista.create({ data: { status: 'pendente', descricao: novaTarefa.descricao, data: new Date(novaTarefa.data), prioridade: novaTarefa.prioridade}});

  return new Response(JSON.stringify({ message: 'Tarefa adicionada', tarefa }), { status: 201 });
}