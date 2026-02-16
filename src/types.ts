export type TaskStatus = "pending" | "active" | "done";

export type TaskPriority = "low" | "normal" | "high";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  result: string | null;
  created_at: string;
  claimed_at: string | null;
  completed_at: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
}
