import { z } from "zod";
import { fail, ok } from "@/lib/apiError";
import { addFarmUser } from "../../../../../packages/db/fieldlogQueries";
import { ensureUser } from "../../../../../packages/db/queries";

const BodySchema = z.object({
  farmId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["owner", "manager", "worker", "auditor"]),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const userId = await ensureUser(body.email);
    const membership = await addFarmUser({ farmId: body.farmId, userId, role: body.role, invitedEmail: body.email });
    return ok({ membership }, 201);
  } catch (err: unknown) {
    return fail("FARM_USER_ADD_FAILED", "Unable to add farm user", err instanceof Error ? err.message : String(err), 400);
  }
}
