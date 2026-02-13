import { z } from "zod";
import { fail, ok } from "@/lib/apiError";
import { addFarmUser } from "../../../../../packages/db/fieldlogQueries";
import { ensureUser } from "../../../../../packages/db/queries";
import { addFarmUserDemo } from "@/lib/demoStore";

const BodySchema = z.object({
  farmId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["owner", "manager", "worker", "auditor"]),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    try {
      const userId = await ensureUser(body.email);
      const membership = await addFarmUser({ farmId: body.farmId, userId, role: body.role, invitedEmail: body.email });
      return ok({ membership }, 201);
    } catch {
      const membership = addFarmUserDemo(body.farmId, body.email, body.role);
      return ok({ membership, degraded: true }, 201);
    }
  } catch (err: unknown) {
    return fail("FARM_USER_ADD_FAILED", "Unable to add farm user", err instanceof Error ? err.message : String(err), 400);
  }
}
