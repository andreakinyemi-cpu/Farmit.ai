import { fail, ok } from "@/lib/apiError";
import { listActivities } from "../../../../../packages/db/fieldlogQueries";

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const farmId = u.searchParams.get("farmId");
    if (!farmId) return fail("BAD_REQUEST", "farmId is required");

    const type = u.searchParams.get("type") ?? undefined;
    const fieldId = u.searchParams.get("fieldId") ?? undefined;
    const from = u.searchParams.get("from") ?? undefined;
    const to = u.searchParams.get("to") ?? undefined;

    const records = await listActivities({ farmId, type, fieldId, from, to });
    return ok({ records });
  } catch (err: unknown) {
    return fail("RECORDS_FAILED", "Unable to list records", err instanceof Error ? err.message : String(err), 400);
  }
}
