import { z } from 'zod';

export const recurrenceEnum = z.enum(['none', 'daily', 'weekly', 'monthly']);

export const priorityEnum = z.enum(['low', 'medium', 'high']);

export const statusEnum = z.enum(['todo', 'doing', 'done', 'pending', 'completed']);

export const tagsSchema = z
  .array(z.string().trim().min(1).max(24))
  .max(10)
  .optional();

export const taskCreateSchema = z.object({
  newTask: z.object({
    description: z.string().trim().min(1).max(500),
    date: z.string().optional(),
    projectId: z.string().uuid().nullish(),
    recurrence: recurrenceEnum.optional(),
    priority: priorityEnum.nullish(),
    tags: tagsSchema,
  }),
});

export const taskUpdateSchema = z
  .object({
    id: z.string(),
    status: statusEnum.optional(),
    description: z.string().trim().min(1).max(500).optional(),
    date: z.string().nullish(),
    projectId: z.string().uuid().nullish(),
    recurrence: recurrenceEnum.nullish(),
    priority: priorityEnum.nullish(),
    pinned: z.boolean().optional(),
    tags: tagsSchema,
  })
  .refine((v) => Object.keys(v).length > 1, { message: 'No fields to update' });

export const reorderSchema = z.object({
  order: z.array(z.string()).min(1),
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['general', 'study', 'work', 'personal']).optional(),
});

export const projectUpdateSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80).optional(),
  pinned: z.boolean().optional(),
  type: z.enum(['general', 'study', 'work', 'personal']).optional(),
});
