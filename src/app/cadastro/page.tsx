import { RegisterForm } from "@/components/Register"
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
        <RegisterForm />
      </div>
      <div>
        <Link href="/login">
          <Button type="button">
            Go to Login page
          </Button>
        </Link>
      </div>
    </div>
  )
}