export type Project = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  type?: string;
  pinned?: boolean;
  pendingCount?: number;
};

export type SubTask = {
  id: string;
  description: string;
  done: boolean;
  order?: number | null;
};

export type Task = {
  id: string;
  description: string;
  date: Date | null;
  status: string;
  recurrence?: string | null;
  priority?: string | null;
  tags?: string[];
  pinned?: boolean;
  order: number;
  projectId: string | null;
  userId: string;
  subtasks?: SubTask[];
};

export type Note = {
  id: string;
  title: string;
  content: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  taskId: string | null;
  projectId: string | null;
  task?: { id: string; description: string } | null;
  project?: { id: string; name: string } | null;
};
