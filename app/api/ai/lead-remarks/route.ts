import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import {
  completeAiText,
  isAiAuthError,
  resolveAiProvider,
} from "@/lib/ai-client";
import { remarkSourceLines } from "@/lib/lead-ai";

function remarksPrompt(facts: string[]) {
  return `Write a short remark for a property broker.

Use ONLY these facts:
${facts.map((fact) => `- ${fact}`).join("\n")}

Rules:
- Notes are already saved in a separate field. Write the remark in addition to the notes. Do not tell anyone to delete or replace the notes.
- Do not invent a budget, location, size, phone number, name, or preference that is not listed.
- Do not guess how urgent the lead is unless temperature is listed.
- One or two sentences, plain English.

Return ONLY JSON: {"remarks": string}`;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  // Temporary stop: remarks AI is off. Voice goes into notes only.
  return Response.json(
    { error: "AI remarks are temporarily off" },
    { status: 503 },
  );

  try {
    const body = await request.json();
    const facts = remarkSourceLines(body);
    if (!facts.length) {
      return Response.json(
        { error: "Add a few lead details or notes before suggesting remarks." },
        { status: 400 },
      );
    }

    if (!resolveAiProvider()) {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 },
      );
    }

    const raw = await completeAiText(
      remarksPrompt(facts),
      "Write broker remarks from the supplied facts only. Return only valid JSON. Do not invent missing information.",
    );
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ error: "Unexpected AI response" }, { status: 500 });
    }
    const parsed = JSON.parse(match[0]) as { remarks?: unknown };
    const remarks =
      typeof parsed.remarks === "string" ? parsed.remarks.trim() : "";
    if (!remarks) {
      return Response.json(
        { error: "Could not write remarks from these details." },
        { status: 422 },
      );
    }

    return Response.json({ remarks: remarks.slice(0, 500) });
  } catch (error) {
    console.error("lead remarks error:", error);
    if (error instanceof Error && error.message === "AI_NOT_CONFIGURED") {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 },
      );
    }
    const status = isAiAuthError(error) ? 503 : 500;
    const message = isAiAuthError(error)
      ? "AI service misconfigured"
      : "Failed to write remarks";
    return Response.json({ error: message }, { status });
  }
}
