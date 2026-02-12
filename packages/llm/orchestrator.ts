import fs from "node:fs";
import path from "node:path";
import { openai } from "./openaiClient";
import type { Msg } from "./types";
import { retrieveContext } from "../rag/retrieve";
import { runTool, toolSchemas } from "./toolRouter";
import { getMessages, saveMessage } from "../db/queries";
import { extractAndStoreMemories } from "./memoryExtract";

function loadPrompt(file: string) {
  const p = path.join(process.cwd(), "packages", "prompts", file);
  return fs.readFileSync(p, "utf8");
}

export async function runChat(params: { userId: string; conversationId: string; userText: string }) {
  const { userId, conversationId, userText } = params;

  const system = loadPrompt("system_v1.txt");
  const developer = loadPrompt("developer_v1.txt");
  const toolPolicy = loadPrompt("tool_policy_v1.txt");
  const refusalStyle = loadPrompt("refusal_style_v1.txt");

  const history = await getMessages(conversationId, 40);
  const historyMsgs: Msg[] = history.map((m) => ({ role: m.role, name: m.name ?? undefined, content: m.content }));

  const retrieved = await retrieveContext({ userId, query: userText });

  const messages: Msg[] = [
    { role: "system", content: system },
    { role: "developer", content: developer },
    { role: "system", content: toolPolicy },
    { role: "system", content: refusalStyle },
    retrieved
      ? { role: "system", content: `Retrieved context:\n${retrieved}` }
      : { role: "system", content: "Retrieved context: (none)" },
    ...historyMsgs.filter((m) => m.role !== "system" && m.role !== "developer"),
    { role: "user", content: userText },
  ];

  await saveMessage({ conversationId, role: "user", content: userText });

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  for (let step = 0; step < 8; step++) {
    const resp: any = await openai.responses.create({
      model,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: toolSchemas.map((t) => ({
        type: "function",
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      })),
      tool_choice: "auto",
    } as any);

    const toolCalls = resp.output?.filter((o: any) => o.type === "function_call") ?? [];

    if (toolCalls.length) {
      for (const call of toolCalls) {
        const toolName = call.name;
        let args: any = {};
        try {
          args = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          args = call.arguments ?? {};
        }

        const toolResult = await runTool(toolName, args);

        messages.push({ role: "tool", name: toolName, content: toolResult });
        await saveMessage({ conversationId, role: "tool", name: toolName, content: toolResult });
      }
      continue;
    }

    const text = resp.output_text ?? "";
    messages.push({ role: "assistant", content: text });

    await saveMessage({
      conversationId,
      role: "assistant",
      content: text,
      model: resp.model,
      prompt_tokens: (resp as any).usage?.input_tokens,
      completion_tokens: (resp as any).usage?.output_tokens,
    });

    if (process.env.ENABLE_MEMORY_EXTRACTION === "true") {
      await extractAndStoreMemories({ userId, userText, assistantText: text });
    }

    return text;
  }

  return "Stopped: too many tool steps. Try a smaller request.";
}
