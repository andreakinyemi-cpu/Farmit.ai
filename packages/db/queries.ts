import { pool } from "./client";

export type Role = "system" | "developer" | "user" | "assistant" | "tool";
export type MessageRow = {
  id: string;
  role: Role;
  name: string | null;
  content: unknown;
  created_at: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd: string | null;
};

export async function ensureUser(email?: string) {
  const e = email ?? "demo@local";
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [e]);
  if (existing.rowCount) return existing.rows[0].id as string;

  const created = await pool.query("INSERT INTO users (email) VALUES ($1) RETURNING id", [e]);
  return created.rows[0].id as string;
}

export async function createConversation(userId: string, title = "New chat") {
  const r = await pool.query(
    "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id",
    [userId, title],
  );
  return r.rows[0].id as string;
}

export async function listConversations(userId: string) {
  const r = await pool.query(
    "SELECT id, title, created_at FROM conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [userId],
  );
  return r.rows as { id: string; title: string; created_at: string }[];
}

export async function getMessages(conversationId: string, limit = 40) {
  const r = await pool.query(
    `SELECT id, role, name, content, created_at, model, prompt_tokens, completion_tokens, cost_usd
     FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [conversationId, limit],
  );
  return r.rows as MessageRow[];
}

export async function saveMessage(params: {
  conversationId: string;
  role: Role;
  content: unknown;
  name?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost_usd?: number;
}) {
  const { conversationId, role, content, name, model, prompt_tokens, completion_tokens, cost_usd } = params;

  await pool.query(
    `INSERT INTO messages
      (conversation_id, role, name, content, model, prompt_tokens, completion_tokens, cost_usd)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      conversationId,
      role,
      name ?? null,
      JSON.stringify(content),
      model ?? null,
      prompt_tokens ?? null,
      completion_tokens ?? null,
      cost_usd ?? null,
    ],
  );
}
