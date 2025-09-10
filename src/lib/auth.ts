import { PrismaClient } from "@/generated/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

const prisma = new PrismaClient()

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

    advanced: {
        database: {
            generateId: false
        }
    },

    plugins: [nextCookies()],

    emailAndPassword: {
        enabled: true,
        autoSignIn: false
    },
})