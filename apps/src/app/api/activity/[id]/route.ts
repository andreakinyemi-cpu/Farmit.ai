import { fail, ok } from "@/lib/apiError";
import { getActivity, getActivityEvents, getActivityExports } from "../../../../../../packages/db/fieldlogQueries";
import { getActivityDemo, getActivityEventsDemo, getActivityExportsDemo } from "@/lib/demoStore";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    try {
      const record = await getActivity(id);
      if (!record) return fail("NOT_FOUND", "Record not found", undefined, 404);
      const [events, exports] = await Promise.all([getActivityEvents(id), getActivityExports(id)]);
      return ok({ record, events, exports });
    } catch {
      const record = getActivityDemo(id);
      if (!record) return fail("NOT_FOUND", "Record not found", undefined, 404);
      const events = getActivityEventsDemo(id);
      const exports = getActivityExportsDemo(id);
      return ok({ record, events, exports, degraded: true });
    }
  } catch (err: unknown) {
    return fail("READ_FAILED", "Unable to load record", err instanceof Error ? err.message : String(err), 400);
  }
}
