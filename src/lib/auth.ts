import { PrismaClient } from "@/generated/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

const prisma = new PrismaClient()

export const auth = betterAuth({

    crossSubdomainCookies: process.env.NODE_ENV === "production",
    secret: process.env.BETTER_AUTH_SECRET,
    databaseURL: process.env.DATABASE_URL,

    trustedOrigins: ["https://lista-de-tarefas-rho-smoky.vercel.app", "http://localhost:3000"],

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