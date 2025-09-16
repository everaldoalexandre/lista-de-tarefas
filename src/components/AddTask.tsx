'use client';

import { useState, useEffect } from 'react';
import {DeleteIcon, EditIcon} from './Lucide';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd'
import {useSession} from "@/lib/auth-client"
import { toast } from "sonner"

type List =  { id: number, description: string; date: Date; status: string; userId: string };

export default function AddTask() {
  const [list, setList] = useState<List[]>([]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [taskSelected, setTaskSelected] = useState<List | null>(null);
  
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [showModalAdd, setShowModalAdd] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [taskEdit, setTaskEdit] = useState<List | null>(null);
  const [descriptionEdit, setDescriptionEdit] = useState('');
  const [dateEdit, setDateEdit] = useState('');


    useEffect(() => {
    toloadTask();

  }, []);

  // EDITAR AS TAREFAS
  function openModalEdit(task: List) {
    setTaskEdit(task);
    setDescriptionEdit(task.description);
    setDateEdit(task.date.toISOString().slice(0,10));
    setShowModalEdit(true);
  }

  async function saveEdit(taskEdit: List, description: string, date: string) {
    try {
      const response = await fetch('/api/tarefa', {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskEdit.id,
          description,
          date: new Date(date + 'Z-3:00'),
        }),
      });

      toast.success("Tarefa editada!")

      if (!response.ok) {
        throw new Error('Erro ao atualizar tarefa');
      }

      toloadTask();
    } catch (error) {
      alert(error);
    }
  }

  async function handleOnDragEnd(result: DropResult){
    if (!result.destination) return;

    const newList = Array.from(list);
    const [reordenada] = newList.splice(result.source.index, 1);
    newList.splice(result.destination.index, 0, reordenada);

    setList(newList);

    try {
      const ordem = newList.map(tarefa => tarefa.id);

      await fetch('/api/tarefa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ordem}),
        
      });
    }catch (error) {
      console.error('Erro ao salvar nova ordem:', error);
      toast.error('Não foi possível salvar a nova ordem. Recarregue a página.');
      toloadTask();
    }
  }

  // MARCAR TAREFA COMO CONCLUIDA
  function marcarTarefa(id: number) {
    const newList = [...list];
    newList[id].status = newList[id].status === 'pendente' ? 'concluido' : 'pendente';
    setList(newList);
    
    const tarefa = newList[id];
    fetch('/api/tarefa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tarefa.id, status: tarefa.status }),
    }).catch(() => {
      toast.error('Erro ao atualizar status');

      const revertList = [...newList];
      revertList[id].status = revertList[id].status === 'pendente' ? 'concluido' : 'pendente';
      setList(revertList);
    });

    toloadTask();
  }

  function confirmarDelete(task: List) {
    setTaskSelected(task);
    setShowModalDelete(true);
  }

  async function deletarTarefaConfirmada() {
  if (!taskSelected) return;

  const response = await fetch('/api/tarefa', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: taskSelected.id }),
  });
  toast.success("Tarefa deletada!")

  if (response.ok) {
    setShowModalDelete(false);
    setTaskSelected(null);
    toloadTask();
    } else {
      toast.error('Erro ao deletar tarefa');
    }
  }

  async function toloadTask() {

    const response = await fetch('/api/tarefa');

    if (response.ok) {
      const data: { list: { id: number, description: string; date: string; status: string; ordem: number; userId: string;}[] } = await response.json();

      const listConverted: List[] = data.list.map((item) => ({
        ...item,
        date: new Date(item.date),
      }));

      setList(listConverted);
    } else{
      console.error('Error loading tasks', response.statusText);
    }
  }

  //MODAL DE TAREFA ADICIONADA
  function openModalAdd() {
  toast.success("Task added!")
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

  const {data: session, isPending} = useSession()

  async function adicionarTarefa(e: React.FormEvent) {
    e.preventDefault();

    if (isPending) {
      toast.success('Checking authentication...');
      return;
    }

    if (!session?.user?.id) {
      toast.error('Unauthenticated user. Please log in.');
      return;
    }
  
    if (!date.trim()) {
      toast.error("Please fill in all fields.")
    return;
    }

    try {
      const newTask = {
        description: description.trim(),
        status: 'pendente',
        date: new Date(date + 'T00:00:00-03:00').toISOString(),
        ordem: 1,
        userId: session.user.id
      };

      const response = await fetch('/api/tarefa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTask })
      });

      const result = await response.json();

      if (response.ok) {
        setDescription('');
        setDate('');
        await toloadTask();
        openModalAdd();
      } else {
        alert(result.error || 'Error adding task. Please try again.');
      }
      
    } catch (error) {
      console.error('Erro na requisição:', error);
      toast.error('Erro de conexão. Tente novamente.');
    }
  }
    return (
    <div className="flex flex-col justify-items-center gap-4 p-4">
      <form onSubmit={adicionarTarefa} className="flex gap-2 bg-white p-3 rounded-2xl">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Digite uma nova tarefa"
          className="p-2 rounded min-w-2xl text-gray-500"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-1 rounded bg-gray-200 text-gray-500"
        />
        <button type="submit" className="bg-gray-200 text-gray-500 px-4 py-2 rounded-2xl">
          +
        </button>
      </form>
      
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="tasks">
          {(provided) => (
            <ul 
            {...provided.droppableProps} 
            ref={provided.innerRef} 
            className="flex flex-col gap-2 w-full max-w-4xl mx-auto">
              {list.map((newTask, id) => (
                <Draggable key={newTask.id} draggableId={String(newTask.id)} index={id}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`grid grid-cols-[40px_2fr_100px_40px_40px] items-center gap-2 p-2 rounded ${newTask.status === 'concluido' ? 'bg-gray-200 text-gray-500 line-through' : 'bg-white text-black'}`}>
                        <input type="checkbox" className="w-5 h5 accent-gray-600" checked={newTask.status === 'concluido'}
                          onChange={() => marcarTarefa(id)} />
                        <span className="break-all">{newTask.description}</span>
                        <span className="text-right">
                          {newTask.date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </span>
                        <button
                          className='bg-white text-gray-500 rounded hover:bg-gray-200 justify-items-center'
                          onClick={() => openModalEdit(newTask)}
                        >
                          <EditIcon/>
                        </button>
                        <button className='bg-white text-gray-500 rounded hover:bg-gray-200 justify-items-center' onClick={() => confirmarDelete(newTask)}> <DeleteIcon /></button>
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
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded font-bold bg-gray-800 text-white hover:bg-gray-950"
                onClick={deletarTarefaConfirmada}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showModalAdd && (
        <div className="fixed inset-0 w-full flex items-start justify-end z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-fit shadow-lg">
            <h2 className="text-lg text-gray-500 font-bold mb-4">Tarefa Adicionada!</h2>            
            <div
              className="h-1 bg-green-500 transition-all duration-500"
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
              value={descriptionEdit}
              onChange={(e) => setDescriptionEdit(e.target.value)}
              placeholder="Descrição"
              className="w-full text-gray-500 p-2 rounded mb-2 border border-gray-300"
            />
            <input
              type="date"
              value={dateEdit}
              onChange={(e) => setDateEdit(e.target.value)}
              className="w-full text-gray-500 p-2 rounded mb-2 border border-gray-300"
            />
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded font-bold text-gray-500 bg-gray-300 hover:bg-gray-400"
                onClick={() => setShowModalEdit(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded font-bold bg-gray-800 text-white hover:bg-gray-950"
                onClick={() => {
                  if (taskEdit) {
                    saveEdit(taskEdit, descriptionEdit, dateEdit);
                    setShowModalEdit(false); // fecha o modal
                    setTaskEdit(null); // limpa estado
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}