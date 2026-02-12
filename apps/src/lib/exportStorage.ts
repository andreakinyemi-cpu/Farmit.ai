import fs from "node:fs";
import path from "node:path";

export function getExportRoot() {
  const configured = process.env.EXPORT_DIR || "./apps/public/exports";
  return path.resolve(process.cwd(), configured);
}

export function ensureExportDir() {
  const root = getExportRoot();
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
}

export function toSafeExportPath(slug: string[]) {
  const sanitized = slug.join("/").replace(/\\/g, "/").replace(/\.\./g, "");
  const root = getExportRoot();
  const full = path.resolve(root, sanitized);
  if (!full.startsWith(root)) {
    throw new Error("Path traversal blocked");
  }
  return { root, full, filename: path.basename(full) };
}

export function contentTypeFor(filename: string) {
  if (filename.endsWith(".pdf")) return "application/pdf";
  if (filename.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (filename.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}
