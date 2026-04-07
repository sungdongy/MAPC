import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import Anthropic from "@anthropic-ai/sdk";

function buildSystemPrompt(agentName: string, agentRole: string): string {
  return `You are an AI agent named "${agentName}" with the role of "${agentRole}".
Respond in the same language as the user's message.
Stay in character and provide helpful responses according to your role.
Keep responses concise and natural.`;
}

async function callWithApiKey(
  apiKey: string,
  message: string,
  systemPrompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: message }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "응답을 생성할 수 없습니다.";
}

async function callWithCli(
  message: string,
  systemPrompt: string
): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\nUser: ${message}`;
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
  const { message, agentName, agentRole, apiKey } = await req.json();
  const systemPrompt = buildSystemPrompt(agentName, agentRole);

  try {
    const response = apiKey
      ? await callWithApiKey(apiKey, message, systemPrompt)
      : await callWithCli(message, systemPrompt);

    return NextResponse.json({ content: response });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "에이전트 응답에 실패했습니다. API Key를 확인해주세요." },
      { status: 500 }
    );
  }
}
