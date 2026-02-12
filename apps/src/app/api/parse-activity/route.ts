import { z } from "zod";
import { parseActivityFromTranscript } from "../../../../../packages/llm/parseActivity";
import { findCatalogCandidates } from "../../../../../packages/db/fieldlogQueries";
import { fail, ok } from "@/lib/apiError";
import { getDemoUser } from "@/lib/demoUser";

const BodySchema = z.object({
  transcript: z.string().min(1),
  farmId: z.string().uuid().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  timestamp: z.string().optional(),
  email: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const userId = await getDemoUser(body.email);

    const { activity, productCandidates } = await parseActivityFromTranscript({
      transcript: body.transcript,
      userId,
      farmId: body.farmId,
      lat: body.lat,
      lon: body.lon,
      timestamp: body.timestamp,
    });

    const additionalCandidates = activity.entities?.product_mention
      ? await findCatalogCandidates(activity.entities.product_mention, 5)
      : [];

    const merged = [...productCandidates, ...additionalCandidates].slice(0, 8);

    return ok({
      activity,
      missing_fields: activity.missing_fields,
      confidence: activity.confidence,
      normalization_notes: activity.normalization_notes,
      product_candidates: merged,
      clarification_question:
        merged.length === 0 && activity.entities?.product_mention
          ? `I could not match "${activity.entities.product_mention}" in catalog. Confirm product name or enter manually.`
          : null,
    });
  } catch (err: unknown) {
    return fail("PARSE_FAILED", "Unable to parse activity", err instanceof Error ? err.message : String(err), 400);
  }
}
