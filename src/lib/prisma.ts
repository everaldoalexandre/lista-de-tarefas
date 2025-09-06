import { PrismaClient } from '@/generated/prisma'

console.log('Inicializando Prisma Client...');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],  
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  console.log('Prisma Client configurado para desenvolvimento');
}

console.log('Prisma Client inicializado com sucesso');

export default prisma