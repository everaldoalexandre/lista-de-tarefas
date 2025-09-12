import { CadastroForm } from "@/components/Cadastro"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function LoginPage() {
  const userSession = await auth.api.getSession({
    headers: await headers()
  })

  if (userSession) {
    redirect('/')
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CadastroForm />
      </div>
      <div>
        <Link href="/login">
          <Button type="button">
            Ir para página de Login
          </Button>
        </Link>
      </div>
    </div>
  )
}