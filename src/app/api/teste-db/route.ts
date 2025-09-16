import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Teste simples de conexão
    await prisma.$connect();
    
    // Teste se as tabelas existem
    const userCount = await prisma.user.count();
    
    return Response.json({ 
      success: true, 
      message: "Banco conectado com sucesso!",
      userCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Erro de conexão com banco:", error);
    
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido",
      timestamp: new Date().toISOString()
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}