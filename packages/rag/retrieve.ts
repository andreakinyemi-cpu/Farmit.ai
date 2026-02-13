import { pool } from "../db/client";
import { embedText } from "./embed";

function toPgVectorLiteral(vec: number[]) {
  return `[${vec.join(",")}]`;
}

export async function retrieveContext(params: { userId: string; query: string }) {
  const { userId, query } = params;
  const qEmbed = await embedText(query);
  const v = toPgVectorLiteral(qEmbed);

  const mem = await pool.query(
    `SELECT kind, content
     FROM memories
     WHERE user_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <-> $2::vector
     LIMIT 6`,
    [userId, v],
  );

  const docs = await pool.query(
    `SELECT source, content
     FROM documents
     WHERE user_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <-> $2::vector
     LIMIT 6`,
    [userId, v],
  );

  const memBlock = mem.rows.map((r: any) => `- (${r.kind}) ${r.content}`).join("\n");
  const docBlock = docs.rows
    .map((r: any) => `- [${r.source ?? "doc"}] ${String(r.content).slice(0, 600)}`)
    .join("\n");

  return [
    mem.rowCount ? `User memory:\n${memBlock}` : "",
    docs.rowCount ? `Relevant documents:\n${docBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
