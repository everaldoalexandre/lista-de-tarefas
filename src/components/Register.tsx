'use client'

import { Label } from "@radix-ui/react-label";
import { GalleryVerticalEnd } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";


export function RegisterForm({
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
            toast.error('Please fill in all fields.')
            return;
        }

        if (password !== passwordconfirmation) {
            toast.error('The passwords do not match.')
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
                    toast.error('This email is already registered. Try using another email.');
                } else if (ctx?.error?.code?.includes('PASSWORD_TOO_SHORT')) {
                    toast.error('Your password must be at least 8 characters long.');
                } else {
                    toast.error('Failed to register. Please try again.');
                }
                console.log(ctx)
            },
            onSuccess(){
                toast.success("Registration completed successfully!");
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
                <h1 className="text-xl font-bold">Enter your details for registration.</h1>
                </div>
                <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                        placeholder="Your full name"
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
                    <Label htmlFor="password">Password</Label>
                    <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Password"
                    />
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="password">Confirm password</Label>
                    <Input
                    id="password"
                    value={passwordconfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    type="password"
                    placeholder="Confirm password"
                    />
                </div>
                <Button type="submit" className="w-full">
                    Register
                </Button>
                </div>
            </div>
            </form>
        </div>
    )
}
