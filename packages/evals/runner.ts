import fs from "node:fs";
import readline from "node:readline";
import { ensureUser, createConversation } from "../db/queries";
import { runChat } from "../llm/orchestrator";

async function main() {
  const userId = await ensureUser("eval@local");
  const conversationId = await createConversation(userId, "eval");

  const rl = readline.createInterface({
    input: fs.createReadStream("packages/evals/cases.jsonl"),
    crlfDelay: Infinity,
  });

  let pass = 0;
  let fail = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);
    const out = await runChat({ userId, conversationId, userText: c.input });

    const mustInclude: string[] = c.must_include ?? [];
    const mustNot: string[] = c.must_not_include ?? [];

    const ok1 = mustInclude.every((s) => out.toLowerCase().includes(s.toLowerCase()));
    const ok2 = mustNot.every((s) => !out.toLowerCase().includes(s.toLowerCase()));

    if (ok1 && ok2) {
      pass++;
      console.log("PASS:", c.input);
    } else {
      fail++;
      console.log("FAIL:", c.input);
      console.log("Output:", out);
    }
  }

  console.log({ pass, fail });
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
