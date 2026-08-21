import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    databaseURL: process.env.DATABASE_URL,

    trustedOrigins: [
        "http://localhost:3000",
        "https://lista-de-tarefas-rho-smoky.vercel.app",
        ...(process.env.TRUSTED_ORIGINS
            ? process.env.TRUSTED_ORIGINS.split(",").map((origin) => origin.trim())
            : []),
    ],

    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

    advanced: {
        database: {
            generateId: false
        },
    },

    plugins: [nextCookies()],

    emailAndPassword: {
        enabled: true,
        autoSignIn: true
    },
})
