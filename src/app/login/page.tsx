import { LoginForm } from "@/components/Login"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"


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
        <LoginForm />
      </div>
    </div>
  )
}