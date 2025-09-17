import { PrismaClient } from "@/generated/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

const prisma = new PrismaClient()

export const auth = betterAuth({

    baseURL:
    process.env.NODE_ENV === "production"
      ? process.env.BETTER_AUTH_URL
      : "http://localhost:3000",
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
        crossSubDomainCookies: {
            enabled: true,
            domain: undefined,
        }
    },

    plugins: [nextCookies()],

    emailAndPassword: {
        enabled: true,
        autoSignIn: true
    },
})