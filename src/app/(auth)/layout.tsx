import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"


export default async function Layout({children}: {children: React.ReactNode}) {
	const userSession = await auth.api.getSession({
		headers: await headers()
	})

	if (!userSession) {
		redirect('/login')
	}

	return <>{children}</>
}