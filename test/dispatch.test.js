const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Database = require("better-sqlite3");

// Import the db functions
let db, createTask, getTasks, claimTask, completeTask, getTask, initDb, closeDb;

// Test database path
let testDbPath;
let testDir;

beforeEach(() => {
  // Create a temporary directory for each test
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "dispatch-test-"));
  testDbPath = path.join(testDir, "test.db");

  // Reset the module cache to get a fresh db instance
  delete require.cache[require.resolve("../dist/db.js")];
  const dbModule = require("../dist/db.js");
  
  createTask = dbModule.createTask;
  getTasks = dbModule.getTasks;
  claimTask = dbModule.claimTask;
  completeTask = dbModule.completeTask;
  getTask = dbModule.getTask;
  initDb = dbModule.initDb;
  closeDb = dbModule.closeDb;

  // Initialize database with test path
  db = initDb(testDbPath);
});

afterEach(() => {
  // Close database and clean up
  closeDb();
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

describe("Task lifecycle", () => {
  it("creates a task with pending status", () => {
    const task = createTask({ title: "Test task" });
    
    assert.equal(typeof task.id, "string");
    assert.equal(task.title, "Test task");
    assert.equal(task.status, "pending");
    assert.equal(task.priority, "normal");
    assert.equal(task.description, null);
    assert.equal(task.result, null);
    assert.equal(typeof task.created_at, "string");
    assert.equal(task.claimed_at, null);
    assert.equal(task.completed_at, null);
  });

  it("creates a task with description and priority", () => {
    const task = createTask({
      title: "High priority task",
      description: "Important work",
      priority: "high",
    });

    assert.equal(task.title, "High priority task");
    assert.equal(task.description, "Important work");
    assert.equal(task.priority, "high");
    assert.equal(task.status, "pending");
  });

  it("transitions from pending to active", () => {
    const task = createTask({ title: "Test task" });
    const claimed = claimTask(task.id);

    assert.equal(claimed.id, task.id);
    assert.equal(claimed.status, "active");
    assert.equal(typeof claimed.claimed_at, "string");
    assert.notEqual(claimed.claimed_at, null);
  });

  it("transitions from active to done", () => {
    const task = createTask({ title: "Test task" });
    claimTask(task.id);
    const completed = completeTask(task.id, "Task finished successfully");

    assert.equal(completed.id, task.id);
    assert.equal(completed.status, "done");
    assert.equal(completed.result, "Task finished successfully");
    assert.equal(typeof completed.completed_at, "string");
    assert.notEqual(completed.completed_at, null);
  });

  it("completes a task without result", () => {
    const task = createTask({ title: "Test task" });
    claimTask(task.id);
    const completed = completeTask(task.id);

    assert.equal(completed.status, "done");
    assert.equal(completed.result, null);
  });
});

describe("Task retrieval", () => {
  it("gets all tasks", () => {
    createTask({ title: "Task 1" });
    createTask({ title: "Task 2" });
    createTask({ title: "Task 3" });

    const tasks = getTasks();
    assert.equal(tasks.length, 3);
  });

  it("filters tasks by pending status", () => {
    const task1 = createTask({ title: "Task 1" });
    const task2 = createTask({ title: "Task 2" });
    claimTask(task1.id);

    const pending = getTasks("pending");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, task2.id);
  });

  it("filters tasks by active status", () => {
    const task1 = createTask({ title: "Task 1" });
    createTask({ title: "Task 2" });
    claimTask(task1.id);

    const active = getTasks("active");
    assert.equal(active.length, 1);
    assert.equal(active[0].id, task1.id);
  });

  it("filters tasks by done status", () => {
    const task1 = createTask({ title: "Task 1" });
    createTask({ title: "Task 2" });
    claimTask(task1.id);
    completeTask(task1.id);

    const done = getTasks("done");
    assert.equal(done.length, 1);
    assert.equal(done[0].id, task1.id);
  });

  it("limits the number of tasks returned", () => {
    createTask({ title: "Task 1" });
    createTask({ title: "Task 2" });
    createTask({ title: "Task 3" });

    const tasks = getTasks("all", 2);
    assert.equal(tasks.length, 2);
  });

  it("gets a single task by id", () => {
    const created = createTask({ title: "Test task" });
    const retrieved = getTask(created.id);

    assert.notEqual(retrieved, null);
    assert.equal(retrieved.id, created.id);
    assert.equal(retrieved.title, "Test task");
  });

  it("returns null for non-existent task", () => {
    const task = getTask("non-existent-id");
    assert.equal(task, null);
  });
});

describe("Error handling", () => {
  it("throws when claiming non-pending task", () => {
    const task = createTask({ title: "Test task" });
    claimTask(task.id);

    assert.throws(
      () => claimTask(task.id),
      /is not pending/
    );
  });

  it("throws when completing non-active task", () => {
    const task = createTask({ title: "Test task" });

    assert.throws(
      () => completeTask(task.id),
      /is not active/
    );
  });

  it("throws when claiming non-existent task", () => {
    assert.throws(
      () => claimTask("non-existent-id"),
      /not found/
    );
  });

  it("throws when completing non-existent task", () => {
    assert.throws(
      () => completeTask("non-existent-id"),
      /not found/
    );
  });
});
