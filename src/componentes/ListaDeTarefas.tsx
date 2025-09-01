import Tarefas from '@/componentes/Tarefas'
import type {Lista} from '@/type/type'

export default async function ListaDeTarefas () {
  const response = await fetch('http://localhost:3000/api/lista_api')
  const {lista} = await response.json() as {lista: Lista[]};
  return(
    <div className="flex flex-col pt-10">
      <div className="">
        <ul className="flex flex-col w-full justify-center items-center">
          {lista.map((lista, index) => (<Tarefas
          key = {index}
          lista = {lista}/>))}
        </ul>
      </div>
    </div>
  )
}