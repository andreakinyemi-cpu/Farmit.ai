import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import { ensureUser, createConversation } from "../../../../../packages/db/queries";
import { runChat } from "../../../../../packages/llm/orchestrator";

const BodySchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  email: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = await rateLimit(`chat:${ip}`, 30, 60);
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: { code: "RATE_LIMIT", message: "Rate limit exceeded" } }, { status: 429 });
    }

    const json = await req.json();
    const body = BodySchema.parse(json);

    const userId = await ensureUser(body.email);

    let conversationId = body.conversationId;
    if (!conversationId) {
      conversationId = await createConversation(userId, "New chat");
    }

    const answer = await runChat({
      userId,
      conversationId,
      userText: body.message,
    });

    return NextResponse.json({ ok: true, conversationId, answer });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CHAT_FAILED",
          message: "Unable to process chat request",
          details: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 400 },
    );
  }
}
