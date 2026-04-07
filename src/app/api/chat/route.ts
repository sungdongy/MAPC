import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import Anthropic from "@anthropic-ai/sdk";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildSystemPrompt(agentName: string, agentRole: string, agentPersona?: string): string {
  let prompt = `You are an AI agent named "${agentName}" with the role of "${agentRole}".
Respond in the same language as the user's message.
Stay in character and provide helpful responses according to your role.`;

  if (agentPersona) {
    prompt += `\n\nYour persona and communication style: ${agentPersona}`;
  } else {
    prompt += `\nKeep responses concise and natural.`;
  }

  return prompt;
}

async function callWithApiKey(
  apiKey: string,
  history: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "응답을 생성할 수 없습니다.";
}

async function callWithCli(
  history: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const conversation = history
    .map((m) => (m.role === "user" ? `User: ${m.content}` : `Assistant: ${m.content}`))
    .join("\n\n");
  const fullPrompt = `${systemPrompt}\n\n${conversation}\n\nAssistant:`;

  return new Promise<string>((resolve, reject) => {
    const proc = execFile(
      "claude",
      ["-p", "--output-format", "text"],
      { timeout: 60000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      }
    );
    proc.stdin?.write(fullPrompt);
    proc.stdin?.end();
  });
}

export async function POST(req: NextRequest) {
  const { message, agentName, agentRole, agentPersona, apiKey, history = [] } = await req.json();
  const systemPrompt = buildSystemPrompt(agentName, agentRole, agentPersona);

  // Build full history including the new message
  const fullHistory: ChatMessage[] = [
    ...history.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const response = apiKey
      ? await callWithApiKey(apiKey, fullHistory, systemPrompt)
      : await callWithCli(fullHistory, systemPrompt);

    return NextResponse.json({ content: response });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "에이전트 응답에 실패했습니다." },
      { status: 500 }
    );
  }
}
