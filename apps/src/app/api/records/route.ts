import { fail, ok } from "@/lib/apiError";
import { listActivities } from "../../../../../packages/db/fieldlogQueries";
import { listActivitiesDemo } from "@/lib/demoStore";

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const farmId = u.searchParams.get("farmId");
    if (!farmId) return fail("BAD_REQUEST", "farmId is required");

    const type = u.searchParams.get("type") ?? undefined;
    const fieldId = u.searchParams.get("fieldId") ?? undefined;
    const from = u.searchParams.get("from") ?? undefined;
    const to = u.searchParams.get("to") ?? undefined;

    try {
      const records = await listActivities({ farmId, type, fieldId, from, to });
      return ok({ records });
    } catch {
      let records = listActivitiesDemo(farmId);
      if (type) records = records.filter((r) => r.type === type);
      if (fieldId) records = records.filter((r) => r.field_id === fieldId);
      if (from) records = records.filter((r) => r.occurred_at >= from);
      if (to) records = records.filter((r) => r.occurred_at <= to);
      return ok({ records, degraded: true });
    }
  } catch (err: unknown) {
    return fail("RECORDS_FAILED", "Unable to list records", err instanceof Error ? err.message : String(err), 400);
  }
}
