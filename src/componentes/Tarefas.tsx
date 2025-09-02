import type { Lista } from "@/type/type";

type Props = {lista: Lista}

export default function Tarefas ({lista}: Props) {
    return(
      <li className="list-none relative flex justify-end mb-2 border-2 border-gray-600 hover:bg-fuchsia-300 transition-transform duration-300 gap-5 text-black p-3 w-full">
        <div className="w-3/4">{lista.descricao}</div>
        <div className="w-1/4">{lista.data}</div>
        <div className="w-1/4">{lista.status}</div>
      </li>
    );
}