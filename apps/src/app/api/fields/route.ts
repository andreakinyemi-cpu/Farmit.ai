import { z } from "zod";
import { fail, ok } from "@/lib/apiError";
import { createField, listFields } from "../../../../../packages/db/fieldlogQueries";

const BodySchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(1),
  acreage: z.number().positive(),
  centroidLat: z.number().optional(),
  centroidLon: z.number().optional(),
  polygonGeojson: z.any().optional(),
});

export async function GET(req: Request) {
  try {
    const farmId = new URL(req.url).searchParams.get("farmId");
    if (!farmId) return fail("BAD_REQUEST", "farmId is required");
    const fields = await listFields(farmId);
    return ok({ fields });
  } catch (err: unknown) {
    return fail("FIELDS_LIST_FAILED", "Unable to list fields", err instanceof Error ? err.message : String(err), 400);
  }
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const field = await createField(body);
    return ok({ field }, 201);
  } catch (err: unknown) {
    return fail("FIELD_CREATE_FAILED", "Unable to create field", err instanceof Error ? err.message : String(err), 400);
  }
}
