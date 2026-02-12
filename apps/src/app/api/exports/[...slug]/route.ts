import fs from "node:fs";
import { fail } from "@/lib/apiError";
import { contentTypeFor, toSafeExportPath } from "@/lib/exportStorage";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    if (!slug?.length) return fail("BAD_REQUEST", "Export path is required", undefined, 400);

    const { full, filename } = toSafeExportPath(slug);
    if (!fs.existsSync(full)) return fail("NOT_FOUND", "Export file not found", undefined, 404);

    const bytes = fs.readFileSync(full);
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": contentTypeFor(filename),
        "content-disposition": `attachment; filename=\"${filename}\"`,
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err: unknown) {
    return fail("EXPORT_READ_FAILED", "Unable to read export", err instanceof Error ? err.message : String(err), 400);
  }
}
