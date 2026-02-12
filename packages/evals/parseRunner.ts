import fs from "node:fs";
import readline from "node:readline";
import { ensureUser } from "../db/queries";
import { parseActivityFromTranscript } from "../llm/parseActivity";

async function main() {
  const userId = await ensureUser("eval@local");
  const rl = readline.createInterface({
    input: fs.createReadStream("packages/evals/parse_cases.jsonl"),
    crlfDelay: Infinity,
  });

  let pass = 0;
  let fail = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);
    const out = await parseActivityFromTranscript({ transcript: c.transcript, userId });
    const got = out.activity;

    const typeOk = got.type === c.expect_type;
    const miss = c.must_missing ?? [];
    const missOk = miss.every((m: string) => got.missing_fields.includes(m));

    if (typeOk && missOk) {
      pass++;
      console.log("PASS", c.transcript);
    } else {
      fail++;
      console.log("FAIL", c.transcript);
      console.log(JSON.stringify(got, null, 2));
    }
  }

  console.log({ pass, fail });
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
