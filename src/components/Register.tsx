'use client'

import { Label } from "@/components/ui/label";
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
            callbackURL: "/app",
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
            },
            onSuccess(){
                toast.success("Registration completed successfully!");
                window.location.href = "/app"
            }
        });
    }
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2">
                <div
                    className="flex flex-col items-center gap-2 font-medium"
                >
                    <div className="flex size-8 items-center justify-center rounded-md">
                    <GalleryVerticalEnd className="size-6" />
                    </div>
                    <span className="sr-only">Acme Inc.</span>
                </div>
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Password"
                    />
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                    id="confirmPassword"
                    autoComplete="new-password"
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
            <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
            </div>
            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => authClient.signIn.social(
                    { provider: 'google', callbackURL: '/app' },
                    { onError: () => { toast.error('Google sign-in is not available right now.'); } }
                )}
            >
                <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z" />
                    <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z" />
                    <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.6 0 10.2 0 12s.5 3.4 1.4 4.9l3.8-2.5z" />
                    <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.4 6.7l3.8 2.9c1-2.9 3.7-4.9 6.8-4.9z" />
                </svg>
                Continue with Google
            </Button>
        </div>
    )
}
