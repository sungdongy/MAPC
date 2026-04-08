import { NextRequest, NextResponse } from "next/server";
import { execFile, exec } from "child_process";
import { promisify } from "util";
import { readdir, readFile as fsReadFile, writeFile as fsWriteFile, stat } from "fs/promises";
import { join, resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";

const execAsync = promisify(exec);

// ─── Types ──────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TeamContext = {
  name: string;
  goal: string;
  rules: string[];
};

type ToolCall = {
  name: string;
  input: string;
  result: string;
};

// ─── Tool Definitions ───────────────────────────────────────────

const ALL_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_files",
    description: "List files and directories at a given path. Returns file names, types, and sizes.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Directory path to list" },
      },
      required: ["path"],
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a file. Useful for analyzing code, configuration, or documents.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path to read" },
        max_lines: { type: "number", description: "Maximum number of lines to read (default: 200)" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write or overwrite a file with the given content.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path to write" },
        content: { type: "string", description: "Content to write to the file" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "run_command",
    description: "Execute a shell command and return the output. Use for git operations, npm commands, system checks, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for information. Returns search results with titles, URLs, and snippets.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
];

// ─── Blocked commands for safety ────────────────────────────────

const BLOCKED_COMMANDS = [
  /\brm\s+-rf\s+\//, // rm -rf /
  /\bmkfs\b/, // format disk
  /\bdd\s+if=/, // disk dump
  /\b(shutdown|reboot|halt|poweroff)\b/,
  /\bkill\s+-9\s+1\b/, // kill init
  />\s*\/dev\/sd/, // write to disk device
];

// ─── Tool Execution ─────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "list_files": {
        const dirPath = resolve(input.path as string);
        const entries = await readdir(dirPath, { withFileTypes: true });
        const results = await Promise.all(
          entries.slice(0, 100).map(async (entry) => {
            const fullPath = join(dirPath, entry.name);
            try {
              const s = await stat(fullPath);
              const type = entry.isDirectory() ? "dir" : "file";
              const size = entry.isDirectory() ? "-" : `${s.size}B`;
              return `${type}\t${size}\t${entry.name}`;
            } catch {
              return `?\t?\t${entry.name}`;
            }
          })
        );
        return `Directory: ${dirPath}\n\n${results.join("\n")}`;
      }

      case "read_file": {
        const filePath = resolve(input.path as string);
        const maxLines = (input.max_lines as number) || 200;
        const content = await fsReadFile(filePath, "utf-8");
        const lines = content.split("\n");
        const truncated = lines.length > maxLines;
        const result = lines.slice(0, maxLines).join("\n");
        return truncated
          ? `${result}\n\n... (${lines.length - maxLines} more lines truncated)`
          : result;
      }

      case "write_file": {
        const filePath = resolve(input.path as string);
        const content = input.content as string;
        await fsWriteFile(filePath, content, "utf-8");
        return `File written successfully: ${filePath} (${content.length} characters)`;
      }

      case "run_command": {
        const command = input.command as string;
        for (const pattern of BLOCKED_COMMANDS) {
          if (pattern.test(command)) {
            return `Error: Command blocked for safety reasons: ${command}`;
          }
        }
        try {
          const { stdout, stderr } = await execAsync(command, {
            timeout: 30000,
            maxBuffer: 1024 * 1024,
          });
          const output = stdout.trim();
          const errors = stderr.trim();
          if (errors && !output) return `stderr:\n${errors}`;
          if (errors) return `${output}\n\nstderr:\n${errors}`;
          return output || "(no output)";
        } catch (e: unknown) {
          const err = e as { stderr?: string; message?: string };
          return `Command failed: ${err.stderr || err.message || "Unknown error"}`;
        }
      }

      case "web_search": {
        const query = input.query as string;
        // Use Claude Code CLI for web search since it has built-in capability
        try {
          const { stdout } = await execAsync(
            `claude -p --output-format text <<'PROMPT'\nSearch the web for: ${query}\nProvide a concise summary of the top results.\nPROMPT`,
            { timeout: 30000, maxBuffer: 1024 * 1024 }
          );
          return stdout.trim() || "No results found.";
        } catch {
          return `Web search failed for query: "${query}". Search capability may not be available.`;
        }
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (e: unknown) {
    const err = e as { message?: string };
    return `Tool error (${name}): ${err.message || "Unknown error"}`;
  }
}

// ─── System Prompt Builder ──────────────────────────────────────

function buildSystemPrompt(
  agentName: string,
  agentRole: string,
  agentPersona?: string,
  teamContext?: TeamContext
): string {
  let prompt = `You are an AI agent named "${agentName}" with the role of "${agentRole}".`;

  if (teamContext) {
    prompt += `\n\nYou are a member of team "${teamContext.name}".`;
    if (teamContext.goal) {
      prompt += `\nTeam goal: ${teamContext.goal}`;
    }
    if (teamContext.rules.length > 0) {
      prompt += `\nTeam rules you must follow:\n${teamContext.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
    }
    prompt += `\nAlways keep the team goal and rules in mind when responding.`;
  }

  if (agentPersona) {
    prompt += `\n\nYour persona and communication style: ${agentPersona}`;
  }

  prompt += `\n\nRespond in the same language as the user's message. Stay in character and provide helpful responses according to your role.`;
  prompt += `\nWhen you use tools, explain what you're doing and share the results clearly.`;

  return prompt;
}

// ─── API Key Mode: Tool Use Loop ────────────────────────────────

async function callWithTools(
  apiKey: string,
  history: { role: string; content: unknown }[],
  systemPrompt: string,
  tools: Anthropic.Tool[],
  maxIterations: number = 10
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const client = new Anthropic({ apiKey });
  const messages = [...history] as Anthropic.MessageParam[];
  const toolCalls: ToolCall[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      messages,
    });

    // Check if there are tool_use blocks
    const toolUseBlocks = response.content.filter(
      (b) => b.type === "tool_use"
    ) as Array<{ type: "tool_use"; id: string; name: string; input: Record<string, unknown> }>;

    if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
      // No more tool calls - extract text
      const textParts = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text);
      return { content: textParts.join("\n") || "응답을 생성할 수 없습니다.", toolCalls };
    }

    // Execute tools
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input);
      toolCalls.push({
        name: block.name,
        input: JSON.stringify(block.input, null, 2),
        result,
      });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }

    // Add assistant response and tool results to messages
    messages.push({ role: "assistant", content: response.content as unknown as string });
    messages.push({ role: "user", content: toolResults as unknown as string });
  }

  return { content: "최대 도구 호출 횟수에 도달했습니다.", toolCalls };
}

// ─── CLI Mode ───────────────────────────────────────────────────

async function callWithCli(
  history: ChatMessage[],
  systemPrompt: string,
  allowedTools: string[] = []
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const conversation = history
    .map((m) => (m.role === "user" ? `User: ${m.content}` : `Assistant: ${m.content}`))
    .join("\n\n");
  const fullPrompt = `${systemPrompt}\n\n${conversation}\n\nAssistant:`;

  const args = ["-p", "--output-format", "text"];
  if (allowedTools.length > 0) {
    args.push("--allowedTools", allowedTools.join(","));
  }

  return new Promise((resolve, reject) => {
    const proc = execFile(
      "claude",
      args,
      { timeout: 60000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ content: stdout.trim(), toolCalls: [] });
      }
    );
    proc.stdin?.write(fullPrompt);
    proc.stdin?.end();
  });
}

// ─── POST Handler ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const {
    message,
    agentName,
    agentRole,
    agentPersona,
    apiKey,
    history = [],
    teamContext,
    allowedTools = [],
  } = await req.json();

  const systemPrompt = buildSystemPrompt(agentName, agentRole, agentPersona, teamContext);

  const fullHistory: ChatMessage[] = [
    ...history.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  // Filter tools based on agent's allowed tools
  const agentTools = allowedTools.length > 0
    ? ALL_TOOLS.filter((t) => allowedTools.includes(t.name))
    : [];

  try {
    const result = apiKey
      ? await callWithTools(apiKey, fullHistory as { role: string; content: unknown }[], systemPrompt, agentTools)
      : await callWithCli(fullHistory, systemPrompt, allowedTools);

    return NextResponse.json({
      content: result.content,
      toolCalls: result.toolCalls,
    });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "에이전트 응답에 실패했습니다." },
      { status: 500 }
    );
  }
}
