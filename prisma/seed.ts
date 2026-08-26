import { auth } from "@/lib/auth"

async function main() {
	const email = process.env.SEED_EMAIL
	const name = process.env.SEED_NAME ?? "Admin"
	const password = process.env.SEED_PASSWORD

	if (!email || !password) {
		console.error("Defina SEED_EMAIL e SEED_PASSWORD no ambiente antes de rodar o seed.")
		return
	}

	if (password.length < 12) {
		console.error("SEED_PASSWORD deve ter pelo menos 12 caracteres.")
		return
	}

	await auth.api.signUpEmail({
		body: {
			email,
			name,
			password,
		}
	})
}

main()
