export type Project = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  pendingCount?: number;
};

export type Task = {
  id: string;
  description: string;
  date: Date | null;
  status: string;
  order: number;
  projectId: string | null;
  userId: string;
};
