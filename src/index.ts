#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { initDb, createTask, getTasks, claimTask, completeTask } from "./db.js";

const server = new Server(
  {
    name: "@rezzedai/dispatch",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize database on startup
initDb();

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_task",
        description: "Create a new task",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Task title (required)",
            },
            description: {
              type: "string",
              description: "Task description (optional)",
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high"],
              description: "Task priority (optional, default: normal)",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "get_tasks",
        description: "List tasks by status",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["pending", "active", "done", "all"],
              description: "Filter by task status (optional, default: all)",
            },
            limit: {
              type: "number",
              description: "Maximum number of tasks to return (optional)",
            },
          },
        },
      },
      {
        name: "claim_task",
        description: "Mark a pending task as active",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "Task ID to claim",
            },
          },
          required: ["taskId"],
        },
      },
      {
        name: "complete_task",
        description: "Mark an active task as done",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "Task ID to complete",
            },
            result: {
              type: "string",
              description: "Result summary (optional)",
            },
          },
          required: ["taskId"],
        },
      },
    ],
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "create_task": {
        if (!args || typeof args !== "object") {
          throw new McpError(ErrorCode.InvalidParams, "Invalid arguments");
        }
        const params = args as Record<string, unknown>;
        if (!params.title || typeof params.title !== "string") {
          throw new McpError(ErrorCode.InvalidParams, "title is required");
        }
        const input = {
          title: params.title,
          description: params.description as string | undefined,
          priority: params.priority as "low" | "normal" | "high" | undefined,
        };
        const task = createTask(input);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      case "get_tasks": {
        const params = (args as { status?: string; limit?: number }) || {};
        const tasks = getTasks(params.status, params.limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case "claim_task": {
        if (!args || typeof args !== "object") {
          throw new McpError(ErrorCode.InvalidParams, "Invalid arguments");
        }
        const { taskId } = args as { taskId: string };
        if (!taskId) {
          throw new McpError(ErrorCode.InvalidParams, "taskId is required");
        }
        const task = claimTask(taskId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      case "complete_task": {
        if (!args || typeof args !== "object") {
          throw new McpError(ErrorCode.InvalidParams, "Invalid arguments");
        }
        const { taskId, result } = args as { taskId: string; result?: string };
        if (!taskId) {
          throw new McpError(ErrorCode.InvalidParams, "taskId is required");
        }
        const task = completeTask(taskId, result);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : String(error)
    );
  }
});

// Start server when run as main module
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dispatch MCP server running on stdio");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}

export { server };
