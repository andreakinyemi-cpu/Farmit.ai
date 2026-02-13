"use client";

import Link from "next/link";
import { useState } from "react";

type RecordRow = { id: string; type: string; occurred_at: string; field_name?: string; status: string };

export default function RecordsPage() {
  const [farmId, setFarmId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [records, setRecords] = useState<RecordRow[]>([]);

  async function load() {
    const q = new URLSearchParams({ farmId, ...(type ? { type } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) });
    const r = await fetch(`/api/records?${q.toString()}`);
    const j = await r.json();
    if (j.ok) setRecords(j.records as RecordRow[]);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6"><div className="max-w-5xl mx-auto space-y-4"><h1 className="text-2xl font-semibold">Records</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2"><input className="bg-zinc-900 rounded p-2" placeholder="Farm ID" value={farmId} onChange={(e) => setFarmId(e.target.value)} /><input className="bg-zinc-900 rounded p-2" placeholder="Type" value={type} onChange={(e) => setType(e.target.value)} /><input className="bg-zinc-900 rounded p-2" placeholder="From ISO" value={from} onChange={(e) => setFrom(e.target.value)} /><input className="bg-zinc-900 rounded p-2" placeholder="To ISO" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <button className="bg-zinc-700 px-3 py-2 rounded" onClick={load}>Apply filters</button>
      <ul className="space-y-2">{records.map((r) => (<li key={r.id} className="bg-zinc-900 rounded p-3 flex justify-between"><div><p>{r.type} — {new Date(r.occurred_at).toLocaleString()}</p><p className="text-xs text-zinc-400">{r.field_name ?? "No field"} | {r.status}</p></div><Link className="text-emerald-400" href={`/records/${r.id}`}>Open</Link></li>))}</ul>
    </div></main>
  );
}
