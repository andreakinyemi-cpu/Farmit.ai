import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { fail, ok } from "@/lib/apiError";
import { addExport, listActivities } from "../../../../../packages/db/fieldlogQueries";
import { generateAuditPackPdf } from "../../../../../packages/tools/pdf";

const BodySchema = z.object({
  farmId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.string().optional(),
  fieldId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const activities = await listActivities({ farmId: body.farmId, from: body.from, to: body.to, type: body.type, fieldId: body.fieldId });

    const exportDir = process.env.EXPORT_DIR || "./apps/public/exports";
    const pdfName = await generateAuditPackPdf({ title: "Audit Pack", activities, exportDir });
    const pdfPath = `/exports/${pdfName}`;
    await addExport({ farmId: body.farmId, kind: "audit_pack_pdf", path: pdfPath });

    const csvName = `audit-pack-${Date.now()}.csv`;
    const csvPath = path.join(exportDir, csvName);
    const header = "id,type,occurred_at,status,field_id\n";
    const bodyCsv = activities
      .map((a) => [a.id, a.type, a.occurred_at, a.status, a.field_id ?? ""].map((v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    fs.mkdirSync(exportDir, { recursive: true });
    fs.writeFileSync(csvPath, header + bodyCsv + "\n");

    const csvPublicPath = `/exports/${csvName}`;
    await addExport({ farmId: body.farmId, kind: "csv", path: csvPublicPath });

    return ok({ pdf: pdfPublicPath(pdfPath), csv: pdfPublicPath(csvPublicPath), count: activities.length });
  } catch (err: unknown) {
    return fail("AUDIT_PACK_FAILED", "Unable to generate audit pack", err instanceof Error ? err.message : String(err), 400);
  }
}

function pdfPublicPath(p: string) {
  return p;
}
