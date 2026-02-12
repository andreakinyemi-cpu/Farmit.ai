import { openai } from "./openaiClient";
import { addMemory } from "../rag/memory";

export async function extractAndStoreMemories(params: {
  userId: string;
  userText: string;
  assistantText: string;
}) {
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const extractorPrompt = `
Extract durable user memories from the exchange.
Only output JSON array. Each item:
{ "kind": "profile|preference|farm_context|fact", "content": "..." , "confidence": 0-1 }
Rules:
- Only store stable, reusable info.
- Do NOT store sensitive data.
- If nothing, output [].
`;

  const resp: any = await openai.responses.create({
    model,
    input: [
      { role: "system", content: extractorPrompt },
      { role: "user", content: `USER: ${params.userText}\nASSISTANT: ${params.assistantText}` },
    ],
  } as any);

  let arr: any[] = [];
  try {
    arr = JSON.parse(resp.output_text || "[]");
  } catch {
    arr = [];
  }

  for (const m of arr) {
    if (!m?.content || typeof m.confidence !== "number") continue;
    if (m.confidence < 0.75) continue;
    if (!["profile", "preference", "farm_context", "fact"].includes(m.kind)) continue;

    await addMemory({
      userId: params.userId,
      kind: m.kind,
      content: String(m.content).slice(0, 500),
    });
  }
}
