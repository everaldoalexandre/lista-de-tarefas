export type Project = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  pinned?: boolean;
  pendingCount?: number;
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
};
