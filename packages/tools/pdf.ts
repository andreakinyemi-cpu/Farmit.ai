import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function generateActivityPdf(params: { record: any; exportDir: string }) {
  ensureDir(params.exportDir);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let y = 760;
  page.drawText(`Activity Record: ${params.record.id}`, { x: 40, y, size: 14, font });
  y -= 24;
  page.drawText(`Type: ${params.record.type} | Status: ${params.record.status}`, { x: 40, y, size: 11, font });
  y -= 18;
  page.drawText(`Occurred At: ${params.record.occurred_at}`, { x: 40, y, size: 11, font });
  y -= 24;
  const lines = JSON.stringify(params.record.data, null, 2).split("\n");
  for (const line of lines.slice(0, 45)) {
    page.drawText(line.slice(0, 100), { x: 40, y, size: 9, font });
    y -= 12;
    if (y < 40) break;
  }

  const bytes = await pdfDoc.save();
  const filename = `activity-${params.record.id}.pdf`;
  const fullPath = path.join(params.exportDir, filename);
  fs.writeFileSync(fullPath, bytes);
  return filename;
}

export async function generateAuditPackPdf(params: { title: string; activities: any[]; exportDir: string }) {
  ensureDir(params.exportDir);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const cover = pdfDoc.addPage([612, 792]);
  cover.drawText(params.title, { x: 40, y: 740, size: 18, font });
  cover.drawText(`Records: ${params.activities.length}`, { x: 40, y: 710, size: 12, font });

  let toc = pdfDoc.addPage([612, 792]);
  toc.drawText("Table of Contents", { x: 40, y: 740, size: 14, font });
  let y = 715;

  for (const [i, act] of params.activities.entries()) {
    toc.drawText(`${i + 1}. ${act.type} - ${act.occurred_at} - ${act.id}`, { x: 40, y, size: 10, font });
    y -= 14;
    if (y < 60) {
      toc = pdfDoc.addPage([612, 792]);
      y = 740;
    }

    const p = pdfDoc.addPage([612, 792]);
    p.drawText(`Activity ${i + 1}: ${act.id}`, { x: 40, y: 740, size: 13, font });
    p.drawText(`Type: ${act.type} | Occurred: ${act.occurred_at}`, { x: 40, y: 720, size: 10, font });
    const lines = JSON.stringify(act.data, null, 2).split("\n");
    let ly = 690;
    for (const line of lines.slice(0, 48)) {
      p.drawText(line.slice(0, 100), { x: 40, y: ly, size: 9, font });
      ly -= 12;
      if (ly < 50) break;
    }
  }

  const bytes = await pdfDoc.save();
  const filename = `audit-pack-${Date.now()}.pdf`;
  fs.writeFileSync(path.join(params.exportDir, filename), bytes);
  return filename;
}
