import AdicionarTarefa from "@/componentes/AdicionarTarefa";
import DataAtual from "@/componentes/DataAtual";

export default function Home() {
  return (
    <div className="font-sans bg-gray-100 items-center justify-items-center min-h-screen pb-20">
      <main className="flex flex-col w-full p-8">
        <div className="w-full pt-20 justify-items-center">
          <DataAtual/>
        </div>
        <div className="w-full justify-items-center pt-5">
          <AdicionarTarefa/>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      </footer>
    </div>
  );
}