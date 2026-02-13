import { z } from "zod";
import { fail, ok } from "@/lib/apiError";
import { createFarm, listFarmsForUser } from "../../../../../packages/db/fieldlogQueries";
import { getDemoUser } from "@/lib/demoUser";
import { createFarmDemo, listFarms } from "@/lib/demoStore";

const CreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  state: z.string().optional(),
  email: z.string().email().optional(),
});

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email") ?? undefined;
  const userId = await getDemoUser(email);
  try {
    const farms = await listFarmsForUser(userId);
    return ok({ farms });
  } catch {
    return ok({ farms: listFarms(userId), degraded: true });
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateSchema.parse(await req.json());
    const userId = await getDemoUser(body.email);
    try {
      const farm = await createFarm({ userId, name: body.name, address: body.address, state: body.state });
      return ok({ farm }, 201);
    } catch {
      const farm = createFarmDemo(userId, body.name, body.address, body.state);
      return ok({ farm, degraded: true }, 201);
    }
  } catch (err: unknown) {
    return fail("FARM_CREATE_FAILED", "Unable to create farm", err instanceof Error ? err.message : String(err), 400);
  }
}
