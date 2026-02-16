import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { Task, TaskStatus, TaskPriority, CreateTaskInput } from "./types.js";

let db: Database.Database | null = null;

export function getDbPath(): string {
  const dispatchDir = path.join(os.homedir(), ".dispatch");
  if (!fs.existsSync(dispatchDir)) {
    fs.mkdirSync(dispatchDir, { recursive: true });
  }
  return path.join(dispatchDir, "tasks.db");
}

export function initDb(dbPath?: string): Database.Database {
  if (db) {
    return db;
  }

  const resolvedPath = dbPath || getDbPath();
  db = new Database(resolvedPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      created_at TEXT NOT NULL,
      claimed_at TEXT,
      completed_at TEXT
    )
  `);

  return db;
}

export function createTask(input: CreateTaskInput): Task {
  const database = db || initDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const priority = input.priority || "normal";

  const stmt = database.prepare(`
    INSERT INTO tasks (id, title, description, priority, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `);

  stmt.run(id, input.title, input.description || null, priority, now);

  return getTask(id)!;
}

export function getTasks(status?: string, limit?: number): Task[] {
  const database = db || initDb();
  let query = "SELECT * FROM tasks";
  const params: any[] = [];

  if (status && status !== "all") {
    query += " WHERE status = ?";
    params.push(status);
  }

  query += " ORDER BY created_at DESC";

  if (limit && limit > 0) {
    query += " LIMIT ?";
    params.push(limit);
  }

  const stmt = database.prepare(query);
  return stmt.all(...params) as Task[];
}

export function getTask(taskId: string): Task | null {
  const database = db || initDb();
  const stmt = database.prepare("SELECT * FROM tasks WHERE id = ?");
  return (stmt.get(taskId) as Task) || null;
}

export function claimTask(taskId: string): Task {
  const database = db || initDb();
  const task = getTask(taskId);

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  if (task.status !== "pending") {
    throw new Error(`Task ${taskId} is not pending (current status: ${task.status})`);
  }

  const now = new Date().toISOString();
  const stmt = database.prepare(`
    UPDATE tasks
    SET status = 'active', claimed_at = ?
    WHERE id = ?
  `);

  stmt.run(now, taskId);
  return getTask(taskId)!;
}

export function completeTask(taskId: string, result?: string): Task {
  const database = db || initDb();
  const task = getTask(taskId);

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  if (task.status !== "active") {
    throw new Error(`Task ${taskId} is not active (current status: ${task.status})`);
  }

  const now = new Date().toISOString();
  const stmt = database.prepare(`
    UPDATE tasks
    SET status = 'done', completed_at = ?, result = ?
    WHERE id = ?
  `);

  stmt.run(now, result || null, taskId);
  return getTask(taskId)!;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
