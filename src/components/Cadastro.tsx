'use client'

import { Label } from "@radix-ui/react-label";
import { GalleryVerticalEnd } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";


export function CadastroForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordconfirmation, setPasswordConfirmation] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email || !password || !passwordconfirmation || !name) {
            toast.error('Por favor, preencha todos os campos.')
            return;
        }

        if (password !== passwordconfirmation) {
            toast.error('As senhas não estão iguais.')
            return;
        }
            
        await authClient.signUp.email({
            
            email,
            password,
            name,
            callbackURL: "/",
        },{
            onRequest(){

            },
            onError(ctx) {
                if (ctx?.error?.code?.includes('USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL')) {
                    toast.error('Este email já está cadastrado. Tente usar outro email.');
                } else if (ctx?.error?.code?.includes('PASSWORD_TOO_SHORT')) {
                    toast.error('Sua senha precisa ter no mínimo 8 caracteres.');
                } else {
                    toast.error('Falha ao realizar o cadastro. Tente novamente.');
                }
                console.log(ctx)
            },
            onSuccess(){
                toast.success("Cadastro realizado com sucesso!");
                window.location.href = "/"
            }
        });
    }
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
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="m@example.com"
                    />
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Sua senha"
                    />
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                    id="password"
                    value={passwordconfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
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
