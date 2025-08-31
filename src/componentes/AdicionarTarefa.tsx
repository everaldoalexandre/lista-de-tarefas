'use client'; // apenas no App Router

import { useState, useEffect } from 'react';

type Lista =  { descricao: string; data: Date; status: string; prioridade: string };

export default function AdicionarTarefa() {
  const [prioridade, setPrioridade] = useState('');
  const [lista, setLista] = useState<Lista[]>([]);
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');

    useEffect(() => {
    carregarTarefas();
  }, []);

  async function carregarTarefas() {
    const response = await fetch('/api/lista_api');
    if (response.ok) {
      const data: { lista: { descricao: string; data: string; status: string; prioridade: string; }[] } = await response.json();
      const listaConvertida: Lista[] = data.lista.map((item) => ({
        ...item,
        data: new Date(item.data),
      }));
      setLista(listaConvertida);
    }
  }

  async function adicionarTarefa(e: React.FormEvent) {
    e.preventDefault();

    if (!descricao.trim() || !prioridade.trim() || !data.trim()) return;


    const novaTarefa = {
      descricao,
      status: 'pendente',
      prioridade,
      data: new Date(data + 'Z-3:00'),
    }
    console.log(data)
    console.log(novaTarefa)
    const response = await fetch('/api/lista_api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novaTarefa })
    });

    if (response.ok) {
      setDescricao('');       // limpa input
      carregarTarefas();     // recarrega lista
    } else {
      alert('Erro ao adicionar tarefa');
    }
  }

  return (
    <div className="flex flex-col justify-items-center gap-4 p-4">
      <form onSubmit={adicionarTarefa} className="flex gap-2 bg-white p-3 rounded-2xl">
        <input
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Digite uma nova tarefa"
          className="p-2 rounded text-gray-500"
        />
        <input
          type="Date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="p-1 rounded bg-gray-200 text-gray-500"
        />
        <select
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value)}
          className='p-2 rounded-md bg-gray-200 text-gray-500'
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>
        <button type="submit" className="bg-gray-200 text-gray-500 px-4 py-2 rounded-2xl">
          +
        </button>
      </form>
      <ul className="flex flex-col gap-2">
        {lista.map((novaTarefa, index) => (
          <li key={index} className="border p-2 rounded bg-gray-50 text-black">
            {novaTarefa.descricao} {novaTarefa.prioridade} {novaTarefa.data.toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo'})}
          </li>
        ))}
      </ul>
    </div>
  );
}
