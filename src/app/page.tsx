import AdicionarTarefa from "@/componentes/AdicionarTarefa";
import Tarefas from "@/componentes/Tarefas";
import Image from "next/image";

export default function Home() {
  return (
    <div className="font-sans bg-amber-100 items-center justify-items-center min-h-screen pb-20">
      <main className="flex flex-col w-full p-8">
        <div className="w-full h-40 justify-items-center border-b-2">
          <Image src='/Banner.png' alt="Banner" width={200} height={100} className="rounded-md justify-center"/>
        </div>
        <div className="flex flex-row w-full p-6 border-b-2">
          <div className="w-full">
            <div className="flex text-2xl justify-items-center"><AdicionarTarefa/></div>
          </div>
        </div>
        <div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        
      </footer>
    </div>
  );
}
