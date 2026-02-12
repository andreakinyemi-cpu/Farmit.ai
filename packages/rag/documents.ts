import { pool } from "../db/client";
import { embedText } from "./embed";

function toPgVectorLiteral(vec: number[]) {
  return `[${vec.join(",")}]`;
}

export async function addDocument(params: {
  userId: string;
  source?: string;
  content: string;
}) {
  const embedding = await embedText(params.content);
  await pool.query(
    `INSERT INTO documents (user_id, source, content, embedding)
     VALUES ($1, $2, $3, $4::vector)`,
    [params.userId, params.source ?? null, params.content, toPgVectorLiteral(embedding)],
  );
}
