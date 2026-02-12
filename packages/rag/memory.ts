import { pool } from "../db/client";
import { embedText } from "./embed";

function toPgVectorLiteral(vec: number[]) {
  return `[${vec.join(",")}]`;
}

export async function addMemory(params: {
  userId: string;
  kind: "profile" | "preference" | "farm_context" | "fact";
  content: string;
}) {
  const embedding = await embedText(params.content);
  await pool.query(
    `INSERT INTO memories (user_id, kind, content, embedding)
     VALUES ($1, $2, $3, $4::vector)`,
    [params.userId, params.kind, params.content, toPgVectorLiteral(embedding)],
  );
}
