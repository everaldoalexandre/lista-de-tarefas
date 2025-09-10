'use client'

import { authClient } from "@/lib/auth-client"
import { Button } from "./ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner";

export default function Logout() {
    const router = useRouter();
    return <div>
        <Button type="button" onClick={
            () => authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        router.replace("/login");
                        toast.success("Conta deslogada.")
                    }
                }
            })}>Deslogar</Button>
    </div>
}