import { z } from "zod";
import { fail, ok } from "@/lib/apiError";
import { createFarm, listFarmsForUser } from "../../../../../packages/db/fieldlogQueries";
import { getDemoUser } from "@/lib/demoUser";

const CreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  state: z.string().optional(),
  email: z.string().email().optional(),
});

export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get("email") ?? undefined;
    const userId = await getDemoUser(email);
    const farms = await listFarmsForUser(userId);
    return ok({ farms });
  } catch (err: unknown) {
    return fail("FARMS_LIST_FAILED", "Unable to list farms", err instanceof Error ? err.message : String(err), 400);
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateSchema.parse(await req.json());
    const userId = await getDemoUser(body.email);
    const farm = await createFarm({ userId, name: body.name, address: body.address, state: body.state });
    return ok({ farm }, 201);
  } catch (err: unknown) {
    return fail("FARM_CREATE_FAILED", "Unable to create farm", err instanceof Error ? err.message : String(err), 400);
  }
}
