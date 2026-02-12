import { z } from "zod";
import { getDemoUser } from "@/lib/demoUser";
import { fail, ok } from "@/lib/apiError";
import { ParseOutputSchema } from "../../../../../../packages/tools/activitySchemas";
import { validateRequiredFields, validateRanges } from "../../../../../../packages/tools/validator";
import {
  addExport,
  appendActivityEvent,
  createActivity,
  createFarm,
  findCatalogCandidates,
  getFieldById,
  listFarmsForUser,
} from "../../../../../../packages/db/fieldlogQueries";
import { getWeather } from "../../../../../../packages/tools/weather";
import { generateActivityPdf } from "../../../../../../packages/tools/pdf";

const BodySchema = z.object({
  farmId: z.string().uuid().optional(),
  draft: ParseOutputSchema,
  status: z.enum(["draft", "final"]).default("final"),
  transcript: z.string().optional(),
  gps: z.object({ lat: z.number(), lon: z.number() }).optional(),
  override_reason: z.string().optional(),
  email: z.string().email().optional(),
});

async function resolveFarmId(userId: string, farmId?: string) {
  if (farmId) return farmId;
  const farms = await listFarmsForUser(userId);
  if (farms[0]?.id) return farms[0].id as string;
  const created = await createFarm({ userId, name: "Default Farm" });
  return created.id as string;
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const userId = await getDemoUser(body.email);
    const farmId = await resolveFarmId(userId, body.farmId);

    const missing = [...new Set([...validateRequiredFields(body.draft), ...body.draft.missing_fields])];
    const fieldId = body.draft.field?.field_id;
    const field = fieldId ? await getFieldById(fieldId) : null;

    const productName = String((body.draft.data as Record<string, unknown>).product_name || body.draft.entities?.product_mention || "");
    const catalog = productName ? (await findCatalogCandidates(productName, 1))[0] : null;

    if (body.gps?.lat != null && body.gps?.lon != null && body.draft.type === "spray") {
      try {
        const weather = await getWeather(body.gps.lat, body.gps.lon, body.draft.occurred_at);
        (body.draft.data as Record<string, unknown>).weather = {
          wind_mph: weather.wind_speed_mph,
          temp_f: weather.temp_f,
          humidity_pct: weather.humidity_pct,
          precip_in: weather.precip_in,
        };
      } catch {
        // non-blocking
      }
    }

    const { flags, hard_errors } = validateRanges(body.draft, catalog, field ? Number(field.acreage) : null);

    if (flags.some((f) => f.includes("outside catalog label range")) && !body.override_reason && body.status === "final") {
      hard_errors.push("Override reason is required when rate is outside catalog label range.");
    }

    if ((missing.length > 0 || hard_errors.length > 0) && body.status === "final") {
      return fail(
        "VALIDATION_FAILED",
        "Record has missing or invalid fields",
        { missing_fields: missing, hard_errors, flags },
        422,
      );
    }

    const created = await createActivity({
      farmId,
      fieldId,
      type: body.draft.type,
      occurredAt: body.draft.occurred_at,
      createdBy: userId,
      status: body.status,
      gpsLat: body.gps?.lat ?? body.draft.gps?.lat,
      gpsLon: body.gps?.lon ?? body.draft.gps?.lon,
      transcript: body.transcript,
      data: body.draft,
      finalizedAt: body.status === "final" ? new Date().toISOString() : undefined,
    });

    await appendActivityEvent(created.id, "validation", { missing_fields: missing, flags, hard_errors });
    if (body.override_reason) await appendActivityEvent(created.id, "override_reason", { reason: body.override_reason });

    let exportPath: string | null = null;
    if (body.status === "final") {
      const exportDir = process.env.EXPORT_DIR || "./apps/public/exports";
      const file = await generateActivityPdf({ record: created, exportDir });
      exportPath = `/exports/${file}`;
      await addExport({ activityId: created.id, farmId, kind: "activity_pdf", path: exportPath });
    }

    return ok({
      record_id: created.id,
      farm_id: farmId,
      status: created.status,
      missing_fields: missing,
      flags,
      export: exportPath,
    });
  } catch (err: unknown) {
    return fail("FINALIZE_FAILED", "Failed to finalize activity", err instanceof Error ? err.message : String(err), 400);
  }
}
