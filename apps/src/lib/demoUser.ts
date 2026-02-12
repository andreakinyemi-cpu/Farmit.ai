import { ensureUser } from "../../../packages/db/queries";

export async function getDemoUser(email?: string) {
  const userId = await ensureUser(email ?? "demo@local");
  return userId;
}
