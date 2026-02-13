import { createHash } from "node:crypto";
import { ensureUser } from "../../../packages/db/queries";

function deterministicId(email: string) {
  const hex = createHash("sha1").update(email).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function getDemoUser(email?: string) {
  const e = email ?? "demo@local";
  try {
    const userId = await ensureUser(e);
    return userId;
  } catch {
    return deterministicId(e);
  }
}
