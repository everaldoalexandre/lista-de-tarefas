export type Project = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  _count?: { list: number };
};

export type Task = {
  id: string;
  description: string;
  date: string | null;
  status: string;
  order: number;
  projectId: string | null;
  userId: string;
};
