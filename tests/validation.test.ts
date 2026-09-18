import { describe, it, expect } from 'vitest';
import {
  isUuid,
  noteCreateSchema,
  noteUpdateSchema,
  projectCreateSchema,
  reorderSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from '@/lib/validation';

describe('taskCreateSchema', () => {
  it('aceita tarefa válida', () => {
    expect(taskCreateSchema.safeParse({ newTask: { description: 'Buy milk' } }).success).toBe(true);
  });

  it('rejeita descrição vazia e longa demais', () => {
    expect(taskCreateSchema.safeParse({ newTask: { description: '   ' } }).success).toBe(false);
    expect(taskCreateSchema.safeParse({ newTask: { description: 'x'.repeat(501) } }).success).toBe(false);
  });

  it('rejeita projectId inválido', () => {
    expect(
      taskCreateSchema.safeParse({ newTask: { description: 'Buy milk', projectId: 'not-a-uuid' } }).success
    ).toBe(false);
  });
});

describe('taskUpdateSchema', () => {
  it('exige ao menos um campo além do id', () => {
    expect(taskUpdateSchema.safeParse({ id: 'abc' }).success).toBe(false);
    expect(taskUpdateSchema.safeParse({ id: 'abc', pinned: true }).success).toBe(true);
  });
});

describe('projectCreateSchema', () => {
  it('rejeita nome vazio e aceita tipo válido', () => {
    expect(projectCreateSchema.safeParse({ name: '' }).success).toBe(false);
    expect(projectCreateSchema.safeParse({ name: 'Work', type: 'work' }).success).toBe(true);
    expect(projectCreateSchema.safeParse({ name: 'Work', type: 'invalid' }).success).toBe(false);
  });
});

describe('noteCreateSchema', () => {
  it('aceita só título e rejeita título vazio', () => {
    expect(noteCreateSchema.safeParse({ title: 'Ideas' }).success).toBe(true);
    expect(noteCreateSchema.safeParse({ title: '  ' }).success).toBe(false);
  });

  it('rejeita vínculos inválidos', () => {
    expect(noteCreateSchema.safeParse({ title: 'Ideas', taskId: 'nope' }).success).toBe(false);
    expect(noteCreateSchema.safeParse({ title: 'Ideas', projectId: 'nope' }).success).toBe(false);
  });
});

describe('noteUpdateSchema', () => {
  it('exige ao menos um campo além do id', () => {
    expect(noteUpdateSchema.safeParse({ id: 'abc' }).success).toBe(false);
    expect(noteUpdateSchema.safeParse({ id: 'abc', title: 'New' }).success).toBe(true);
  });
});

describe('reorderSchema', () => {
  it('limita o tamanho do array contra DoS', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `id-${i}`);
    expect(reorderSchema.safeParse({ order: ids }).success).toBe(true);
    expect(reorderSchema.safeParse({ order: [...ids, 'id-200'] }).success).toBe(false);
    expect(reorderSchema.safeParse({ order: [] }).success).toBe(false);
  });
});

describe('isUuid', () => {
  it('aceita UUID valido e rejeita o resto', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});
