"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ExportRow = { id: string; kind: string; path: string };
type RecordPayload = { record: { id: string }; events: unknown[]; exports: ExportRow[] };

function toDownloadHref(path: string) {
  const clean = path.replace(/^\/+/, "");
  if (!clean.startsWith("exports/")) return path;
  return `/api/${clean}`;
}

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [record, setRecord] = useState<RecordPayload | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/activity/${id}`).then((r) => r.json()).then((j) => { if (j.ok) setRecord(j as RecordPayload); });
  }, [id]);

  if (!record) return <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">Loading…</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6"><div className="max-w-4xl mx-auto space-y-4"><h1 className="text-2xl font-semibold">Record {record.record.id}</h1><pre className="bg-zinc-900 p-3 rounded text-xs overflow-auto">{JSON.stringify(record.record, null, 2)}</pre><h2 className="text-lg font-medium">Events</h2><pre className="bg-zinc-900 p-3 rounded text-xs overflow-auto">{JSON.stringify(record.events, null, 2)}</pre><h2 className="text-lg font-medium">Exports</h2><ul className="list-disc ml-6">{record.exports.map((e) => (<li key={e.id}><a className="text-emerald-400" href={toDownloadHref(e.path)} target="_blank" rel="noreferrer">{e.kind}</a></li>))}</ul></div></main>
  );
}
