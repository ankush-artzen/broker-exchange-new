import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AiProvider = "openai" | "anthropic";

export function resolveAiProvider(): AiProvider | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (forced === "openai") {
    return process.env.OPENAI_API_KEY ? "openai" : null;
  }
  if (forced === "anthropic") {
    return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  }
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function isAiAuthError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "status" in error &&
    error.status === 401
  );
}

export async function completeAiText(
  prompt: string,
  system: string,
): Promise<string> {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  if (provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content ?? "";
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: `${system}\n\n${prompt}` }],
  });
  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("UNEXPECTED_RESPONSE");
  }
  return block.text;
}
