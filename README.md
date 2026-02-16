# @rezzedai/dispatch

**A lightweight MCP task server for any MCP-compatible client.** Create tasks, claim them, complete them. Works with Claude Code, ChatGPT, Gemini, Cursor, Windsurf, Cline, or any tool supporting the MCP standard.

```json
{
  "mcpServers": {
    "dispatch": {
      "command": "npx",
      "args": ["@rezzedai/dispatch"]
    }
  }
}
```

---

## What It Does

dispatch gives Claude Code a simple task queue via MCP. Four tools, one SQLite database, zero configuration.

- **create_task** — Add a task to the queue
- **get_tasks** — List tasks by status
- **claim_task** — Mark a task as in-progress
- **complete_task** — Mark a task as done

No accounts. No cloud. No config files. Just tasks.

## Install

```bash
npm install -g @rezzedai/dispatch
```

Then add to your Claude Code MCP config (`.claude.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "dispatch": {
      "command": "npx",
      "args": ["@rezzedai/dispatch"]
    }
  }
}
```

**Requirements:** Node.js 18+

## Quick Start

Once configured, any MCP client can use dispatch naturally:

> "Create a task to refactor the auth module"

```
→ create_task(title: "Refactor auth module", description: "Migrate to JWT", priority: "high")
→ Task created: abc-123
```

> "What tasks are pending?"

```
→ get_tasks(status: "pending")
→ 1 task: "Refactor auth module" (high priority)
```

> "Claim the auth task and start working"

```
→ claim_task(taskId: "abc-123")
→ Task claimed.
```

> "Done with the auth refactor"

```
→ complete_task(taskId: "abc-123", result: "Migrated to JWT. 12 endpoints updated.")
→ Task completed.
```

## MCP Tools

### create_task

Create a new task in the queue.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Task title (max 200 chars) |
| `description` | string | No | Detailed description (max 4000 chars) |
| `priority` | string | No | `low`, `normal` (default), `high` |

### get_tasks

List tasks by status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | `pending` (default), `active`, `done`, `all` |
| `limit` | number | No | Max results (default 10, max 50) |

### claim_task

Claim a pending task to start working on it.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | The task ID to claim |

### complete_task

Mark a task as done.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | The task ID to complete |
| `result` | string | No | Summary of what was done (max 2000 chars) |

## Task Lifecycle

```
pending → active → done
```

Create a task → it's `pending`. Claim it → it's `active`. Complete it → it's `done`.

## Storage

All data lives in `~/.dispatch/tasks.db` (SQLite). One file, one table. No daemon, no cloud, no network calls.

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  result TEXT,
  created_at TEXT,
  claimed_at TEXT,
  completed_at TEXT
);
```

## Why Not a JSON File?

You could manage tasks in `tasks.json`. But dispatch adds:

- **MCP integration** — Claude Code uses tasks naturally through conversation
- **Atomic operations** — SQLite transactions prevent corruption
- **Status lifecycle** — Proper state machine with timestamps
- **Query filtering** — Get tasks by status, by priority
- **Zero config** — `npx @rezzedai/dispatch` and it works

## Technical Details

| | |
|---|---|
| **Runtime** | Node.js 18+ |
| **Transport** | stdio (standard MCP server) |
| **Storage** | SQLite via `better-sqlite3` |
| **Dependencies** | `better-sqlite3`, `@modelcontextprotocol/sdk` |
| **Network** | None. No API calls, no telemetry. |
| **Size** | < 300 lines of core logic |

## What's Next?

More tools coming from the @rezzedai toolkit. See [rezzed.ai](https://rezzed.ai) for updates.

## License

MIT

---

Built by [Rezzed](https://rezzed.ai) — the AI product studio.
