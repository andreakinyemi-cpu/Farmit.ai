import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";
import { createConversation } from "../../../../../packages/db/queries";
import { runChat } from "../../../../../packages/llm/orchestrator";
import { getDemoUser } from "@/lib/demoUser";

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

    const userId = await getDemoUser(body.email);

    let conversationId = body.conversationId;
    if (!conversationId) {
      try {
        conversationId = await createConversation(userId, "New chat");
      } catch {
        conversationId = `demo-${Date.now()}`;
      }
    }

    try {
      const answer = await runChat({ userId, conversationId, userText: body.message });
      return NextResponse.json({ ok: true, conversationId, answer });
    } catch {
      return NextResponse.json({
        ok: true,
        degraded: true,
        conversationId,
        answer: "Demo mode: backend AI/storage services are unavailable. Your app UI is running, but chat persistence and model responses require DB/API configuration.",
      });
    }
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
