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

    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    try {
                        const project = await prisma.project.create({
                            data: {
                                name: 'Welcome',
                                type: 'general',
                                userId: user.id,
                            },
                        });
                        await prisma.list.createMany({
                            data: [
                                {
                                    description: 'Welcome to your task manager! This is a task — try editing it.',
                                    status: 'pending',
                                    order: 0,
                                    projectId: project.id,
                                    userId: user.id,
                                },
                                {
                                    description: 'Press the + button to add a task with date, priority and tags',
                                    status: 'pending',
                                    date: new Date(),
                                    order: 1,
                                    projectId: project.id,
                                    userId: user.id,
                                },
                                {
                                    description: 'Explore habits, notes and the pomodoro timer in the menu',
                                    status: 'pending',
                                    order: 2,
                                    projectId: project.id,
                                    userId: user.id,
                                },
                            ],
                        });
                    } catch (error) {
                        console.error('Failed to create welcome project:', error);
                    }
                },
            },
        },
    },

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            socialProviders: {
                google: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                },
            },
        }
        : {}),

    plugins: [nextCookies()],

    emailAndPassword: {
        enabled: true,
        autoSignIn: true
    },
})
