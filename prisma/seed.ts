import { PrismaClient, Prisma } from "../src/generated/prisma";

const prisma = new PrismaClient();

const userData: Prisma.ListaCreateInput[] = [
  {
    descricao: 'Assistir aula',
    data: '',
    status: 'pendente',
    prioridade: 'alta'
  }
];

export async function main() {
  for (const u of userData) {
    await prisma.lista.create({ data: u });
  }
}

main();