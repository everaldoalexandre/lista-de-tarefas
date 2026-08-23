import { z } from 'zod';

export const recurrenceEnum = z.enum(['none', 'daily', 'weekly', 'monthly']);

export const taskCreateSchema = z.object({
  newTask: z.object({
    description: z.string().trim().min(1).max(500),
    date: z.string().optional(),
    projectId: z.string().uuid().nullish(),
    recurrence: recurrenceEnum.optional(),
  }),
});

export const taskUpdateSchema = z
  .object({
    id: z.string(),
    status: z.enum(['pending', 'completed']).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    date: z.string().nullish(),
    projectId: z.string().uuid().nullish(),
    recurrence: recurrenceEnum.nullish(),
  })
  .refine((v) => Object.keys(v).length > 1, { message: 'No fields to update' });

export const reorderSchema = z.object({
  order: z.array(z.string()).min(1),
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const projectUpdateSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80),
});
