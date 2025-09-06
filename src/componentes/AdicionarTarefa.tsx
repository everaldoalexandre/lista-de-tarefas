'use client';

import { useState, useEffect } from 'react';
import {Xdelete, EditIcon} from './Lucide';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd'

type Lista =  { id: number, descricao: string; data: Date; status: string };

export default function AdicionarTarefa() {
  const [lista, setLista] = useState<Lista[]>([]);
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [progress, setProgress] = useState(0);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<Lista | null>(null);
  
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [showModalAdd, setShowModalAdd] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<Lista | null>(null);
  const [descricaoEdit, setDescricaoEdit] = useState('');
  const [dataEdit, setDataEdit] = useState('');


    useEffect(() => {
    carregarTarefas();
  }, []);

  // EDITAR AS TAREFAS
  function abrirModalEditar(tarefa: Lista) {
    setTarefaEditando(tarefa);
    setDescricaoEdit(tarefa.descricao);
    setDataEdit(tarefa.data.toISOString().slice(0,10));
    setShowModalEdit(true);
  }

  async function salvarEdicao(tarefaEditando: Lista, descricao: string, data: string) {
    try {
      const response = await fetch('/api/lista_api', {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tarefaEditando.id,
          descricao,
          data: new Date(data + 'Z-3:00'),
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar tarefa');
      }

      carregarTarefas();
    } catch (error) {
      alert(error);
    }
  }

  async function handleOnDragEnd(result: DropResult){
    if (!result.destination) return;

    const novaLista = Array.from(lista);
    const [reordenada] = novaLista.splice(result.source.index, 1);
    novaLista.splice(result.destination.index, 0, reordenada);

    setLista(novaLista);

    try {
      const ordem = novaLista.map(tarefa => tarefa.id);

      await fetch('/api/lista_api', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ordem}),
        
      });
    }catch (error) {
      console.error('Erro ao salvar nova ordem:', error);
      alert('Não foi possível salvar a nova ordem. Recarregue a página.');
      carregarTarefas();
    }
  }

  // MARCAR TAREFA COMO CONCLUIDA
  function marcarTarefa(id: number) {
    const novaLista = [...lista];
    novaLista[id].status = novaLista[id].status === 'pendente' ? 'concluido' : 'pendente';
    setLista(novaLista);
    
    const tarefa = novaLista[id];
    fetch('/api/lista_api', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tarefa.id, status: tarefa.status }),
    }).catch(() => {
      alert('Erro ao atualizar status');

      const revertLista = [...novaLista];
      revertLista[id].status = revertLista[id].status === 'pendente' ? 'concluido' : 'pendente';
      setLista(revertLista);
    });
    carregarTarefas();
  }

  function confirmarDelete(tarefa: Lista) {
    setTarefaSelecionada(tarefa);
    setShowModalDelete(true);
  }

  async function deletarTarefaConfirmada() {
  if (!tarefaSelecionada) return;

  const response = await fetch('/api/lista_api', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: tarefaSelecionada.id }),
  });

  if (response.ok) {
    setShowModalDelete(false);
    setTarefaSelecionada(null);
    carregarTarefas();
    } else {
      alert('Erro ao deletar tarefa');
    }
  }

  async function carregarTarefas() {

    const response = await fetch('/api/lista_api');

    if (response.ok) {
      const data: { lista: { id: number, descricao: string; data: string; status: string; ordem: number;}[] } = await response.json();

      const listaConvertida: Lista[] = data.lista.map((item) => ({
        ...item,
        data: new Date(item.data),
      }));

      setLista(listaConvertida);
    } else{
      console.error('Erro ao carregar tarefas', response.statusText);
    }
  }

  //MODAL DE TAREFA ADICIONADA
  function abrirModalAdd() {
  setShowModalAdd(true);
  setProgress(0);

  let width = 0;
    const interval = setInterval(() => {
      width += 1; 
      setProgress(width);
      if (width >= 100) {
        clearInterval(interval);
        setShowModalAdd(false);
      }
    }, 30);
  }

  async function adicionarTarefa(e: React.FormEvent) {
    e.preventDefault();

    if (!descricao.trim()) {
      alert('Por favor, digite uma descrição para a tarefa');
    return;
    }
  
    if (!data.trim()) {
      alert('Por favor, selecione uma data');
    return;
    }

    try {
      const novaTarefa = {
        descricao: descricao.trim(),
        status: 'pendente',
        data: new Date(data + 'T00:00:00-03:00').toISOString(),
        oredem: 1
      };

      const response = await fetch('/api/lista_api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaTarefa })
      });

      const result = await response.json();

      if (response.ok) {
        setDescricao('');
        setData('');
        await carregarTarefas();
        setShowModalAdd(true);
        abrirModalAdd();
      } else {
        alert(result.error || 'Erro ao adicionar tarefa');
      }
      
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro de conexão. Tente novamente.');
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
          className="p-2 rounded min-w-2xl text-gray-500"
        />
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="p-1 rounded bg-gray-200 text-gray-500"
        />
        <button type="submit" className="bg-gray-200 text-gray-500 px-4 py-2 rounded-2xl">
          +
        </button>
      </form>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="tarefas">
          {(provided) => (
            <ul 
            {...provided.droppableProps} 
            ref={provided.innerRef} 
            className="flex flex-col gap-2 w-full max-w-4xl mx-auto">
              {lista.map((novaTarefa, id) => (
                <Draggable key={novaTarefa.id} draggableId={String(novaTarefa.id)} index={id}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`grid grid-cols-[40px_2fr_100px_40px_40px] items-center gap-2 p-2 rounded transition-all duration-300 ${novaTarefa.status === 'concluido' ? 'bg-gray-200 text-gray-500 line-through' : 'bg-white text-black'}`}>
                        <input type="checkbox" className="w-5 h5 accent-gray-600" checked={novaTarefa.status === 'concluido'}
                          onChange={() => marcarTarefa(id)} />
                        <span className="break-all">{novaTarefa.descricao}</span>
                        <span className="text-right">
                          {novaTarefa.data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </span>
                        <button
                          className='bg-white text-gray-500 rounded hover:bg-gray-200 justify-items-center'
                          onClick={() => abrirModalEditar(novaTarefa)}
                        >
                          <EditIcon/>
                        </button>
                        <button className='bg-white text-gray-500 rounded hover:bg-gray-200 justify-items-center' onClick={() => confirmarDelete(novaTarefa)}> <Xdelete /></button>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
      {showModalDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-40 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Confirmar exclusão</h2>
            <p className='text-gray-500'>Tem certeza que deseja excluir a tarefa?</p>
            
            <div className="mt-6 flex justify-end gap-4">
              <button 
                className="px-4 py-2 rounded font-bold text-gray-500 bg-gray-300 hover:bg-gray-400"
                onClick={() => setShowModalDelete(false)}
              >
                Cancelar
              </button>
              <button 
                className="px-4 py-2 rounded font-bold bg-gray-800 text-white hover:bg-gray-950"
                onClick={deletarTarefaConfirmada}
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
      {showModalAdd && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-fit shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Tarefa Adicionada!</h2>            
            <div
              className="h-1 bg-green-500 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>  
        </div>
      )}
      {showModalEdit && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Editar Tarefa</h2>
            
            <input
              type="text"
              value={descricaoEdit}
              onChange={(e) => setDescricaoEdit(e.target.value)}
              placeholder="Descrição"
              className="w-full text-gray-500 p-2 rounded mb-2 border border-gray-300"
            />
            <input
              type="date"
              value={dataEdit}
              onChange={(e) => setDataEdit(e.target.value)}
              className="w-full text-gray-500 p-2 rounded mb-2 border border-gray-300"
            />
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded font-bold text-gray-500 bg-gray-300 hover:bg-gray-400"
                onClick={() => setShowModalEdit(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded font-bold bg-gray-800 text-white hover:bg-gray-950"
                onClick={() => {
                  if (tarefaEditando) {
                    salvarEdicao(tarefaEditando, descricaoEdit, dataEdit);
                    setShowModalEdit(false); // fecha o modal
                    setTarefaEditando(null); // limpa estado
                  }
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}