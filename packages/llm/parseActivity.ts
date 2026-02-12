import fs from "node:fs";
import path from "node:path";
import { openai } from "./openaiClient";
import { ParseOutputSchema, type ParseOutput } from "../tools/activitySchemas";
import { findCatalogCandidates, listFields } from "../db/fieldlogQueries";
import { retrieveContext } from "../rag/retrieve";

function loadPrompt(file: string) {
  return fs.readFileSync(path.join(process.cwd(), "packages", "prompts", file), "utf8");
}

function extractJson(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last < 0) throw new Error("No JSON object found");
  return text.slice(first, last + 1);
}

export async function parseActivityFromTranscript(params: {
  transcript: string;
  userId: string;
  farmId?: string;
  lat?: number;
  lon?: number;
  timestamp?: string;
}) {
  const prompt = loadPrompt("parse_activity_v1.txt");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const catalogHints = await findCatalogCandidates(params.transcript, 8);
  const fieldList = params.farmId ? await listFields(params.farmId) : [];
  const memoryContext = await retrieveContext({ userId: params.userId, query: params.transcript });

  const context = {
    known_fields: fieldList.map((f) => ({ id: f.id, name: f.name, acreage: Number(f.acreage) })),
    catalog_candidates: catalogHints.map((c) => ({
      name: c.name,
      epa_reg_no: c.epa_reg_no,
      label_rate_min: c.label_rate_min,
      label_rate_max: c.label_rate_max,
      label_rate_unit: c.label_rate_unit,
      restricted_use: c.restricted_use,
    })),
    provided_gps: params.lat != null && params.lon != null ? { lat: params.lat, lon: params.lon } : null,
    provided_timestamp: params.timestamp ?? null,
    retrieved_context: memoryContext || null,
  };

  const first: any = await openai.responses.create({
    model,
    input: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Transcript:\n${params.transcript}\n\nContext:\n${JSON.stringify(context, null, 2)}`,
      },
    ],
  } as any);

  let parsed: ParseOutput | null = null;
  let rawText = first.output_text || "{}";

  try {
    parsed = ParseOutputSchema.parse(JSON.parse(extractJson(rawText)));
  } catch {
    const repair: any = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "Repair the following into valid JSON matching required schema exactly. Output JSON only, no markdown.",
        },
        { role: "user", content: rawText },
      ],
    } as any);
    rawText = repair.output_text || "{}";
    parsed = ParseOutputSchema.parse(JSON.parse(extractJson(rawText)));
  }

  return {
    activity: parsed,
    productCandidates: catalogHints,
  };
}
