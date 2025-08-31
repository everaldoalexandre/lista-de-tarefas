import { PrismaClient, Prisma } from "../src/generated/prisma";

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
  {
    descricao: 'Assistir aula',
    data: '',
    status: 'pendente',
    prioridade: 'alta'
  }
];

export async function main() {
  for (const u of userData) {
    await prisma.user.create({ data: u });
  }
}

main();