'use client'

import { Label } from "@radix-ui/react-label";
import { GalleryVerticalEnd } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";


export function CadastroForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const emailRef = useRef <HTMLInputElement>(null)
    const passwordRef = useRef <HTMLInputElement>(null)
    const nameRef = useRef <HTMLInputElement>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const email = emailRef.current?.value;
        const password = passwordRef.current?.value;
        const name = nameRef.current?.value;

        if (!email || !password || !name) {
            toast.error('Por favor, preencha todos os campos.')
            return;
        }

        try {
            
            const newUser = await authClient.signUp.email({
                
                email,
                password,
                name,
                callbackURL: "/login",
            });

            await fetch('/api/lista_api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newUser })
            });
            toast.success("Cadastro realizado com sucesso!");

            if (emailRef.current) emailRef.current.value = "";
            if (nameRef.current) nameRef.current.value = "";
            if (passwordRef.current) passwordRef.current.value = "";

            } catch (err) {
            console.error(err);
            toast.error("Erro inesperado. Tente novamente.");
            }
        };
    

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2">
                <a
                    href=""
                    className="flex flex-col items-center gap-2 font-medium"
                >
                    <div className="flex size-8 items-center justify-center rounded-md">
                    <GalleryVerticalEnd className="size-6" />
                    </div>
                    <span className="sr-only">Acme Inc.</span>
                </a>
                <h1 className="text-xl font-bold">Informe seus dados para o cadastro.</h1>
                </div>
                <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                        id="name"
                        autoComplete="name"
                        ref={nameRef}
                        type="text"
                        placeholder="Seu nome completo"
                        required
                    />
                </div>
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
                    Cadastrar
                </Button>
                </div>
            </div>
            </form>
        </div>
    )
}
