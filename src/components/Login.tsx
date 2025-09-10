'use client'

import { GalleryVerticalEnd } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRef } from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = emailRef.current?.value
    const password = passwordRef.current?.value

    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos.")
      return
    }

    await authClient.signIn.email({
      email,
      password,
      callbackURL: "/",
    }, {
      onRequest() {
        // é acionado quando a requisição é enviada
      },
      onError() {
        // é acionado quando ocorre um erro na requisição
        toast.error("Erro ao fazer login. Verifique suas credenciais.")
      },
      onSuccess() {
        // é acionado quando a requisição é bem-sucedida
        toast.success("Login realizado com sucesso!")

        emailRef.current!.value = ''
        passwordRef.current!.value = ''
      }
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">Informe seus dados para o login.</h1>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                autoComplete="off"
                ref={emailRef}
                type="email"
                placeholder="m@example.com"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                ref={passwordRef}
                type="password"
                placeholder="Sua senha"
              />
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}