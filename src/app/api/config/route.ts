import { NextResponse } from 'next/server';

// Configuracao publica (sem segredos): informa ao frontend quais providers
// opcionais estao habilitados. Nunca expor valores de variaveis aqui.
export async function GET() {
  return NextResponse.json({
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
}
