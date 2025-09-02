type Lista = {
  descricao: string;
  data: string;
  status: string;
};

const lista: Lista[]  = [
    {descricao: "Estudar — revisar um capítulo de um livro ou assistir a uma aula online.", data: "", status: 'pendente'} 
];
export async function GET() {
    return Response.json({lista})
}

export async function POST(request: Request) {
  const { novaTarefa } = await request.json();
  const tarefa = { status: 'pendente', descricao: novaTarefa.descricao, data: novaTarefa.data};
  lista.push(tarefa);
  return Response.json({ message: 'Tarefa adicionada', tarefa });
}