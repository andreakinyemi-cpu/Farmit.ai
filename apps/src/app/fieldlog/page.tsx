"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Farm = { id: string; name: string };

type ParseResult = {
  activity: { type: string; [key: string]: unknown };
  missing_fields: string[];
  confidence: Record<string, number>;
  normalization_notes: string[];
  clarification_question?: string | null;
};

type PendingDraft = { id: string; createdAt: string; transcript: string; draft: Record<string, unknown>; farmId?: string };

function fallbackDraftFromTranscript(transcript: string) {
  return {
    type: "other",
    occurred_at: new Date().toISOString(),
    data: { notes: transcript || "Manual draft saved without parser output." },
    missing_fields: [],
    confidence: {},
    normalization_notes: ["fallback_draft_created_without_ai_parse"],
  } as Record<string, unknown>;
}

export default function FieldLogPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [pending, setPending] = useState<PendingDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("fieldlog_pending");
    if (raw) setPending(JSON.parse(raw));

    (async () => {
      try {
        const res = await fetch("/api/farms");
        const data = await res.json();
        if (data.ok) {
          const rows = (data.farms ?? []) as Farm[];
          setFarms(rows);
          if (rows[0]) setFarmId(rows[0].id);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  function savePending(next: PendingDraft[]) {
    setPending(next);
    localStorage.setItem("fieldlog_pending", JSON.stringify(next));
  }

  function queueOfflineDraft(draft: Record<string, unknown>) {
    const p: PendingDraft = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      transcript,
      draft,
      farmId: farmId || undefined,
    };
    savePending([p, ...pending]);
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (ev) => chunksRef.current.push(ev.data);
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await transcribe(blob);
    };
    rec.start();
    mediaRecorderRef.current = rec;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setBusy(true);
    setLastError(null);
    try {
      const fd = new FormData();
      fd.append("audio", new File([blob], "voice-note.webm", { type: "audio/webm" }));
      const r = await fetch("/api/transcribe", { method: "POST", body: fd });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message || "transcribe failed");
      setTranscript(j.transcript);
      await parse(j.transcript);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transcription failed.";
      setLastError(msg);
      alert("Transcription failed. You can still save a manual/offline draft.");
    } finally {
      setBusy(false);
    }
  }

  async function parse(text: string) {
    setLastError(null);
    const r = await fetch("/api/parse-activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript: text, ...(farmId ? { farmId } : {}) }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error?.message || "parse failed");
    setParseResult(j);
  }

  async function finalize(status: "draft" | "final") {
    const draft = (parseResult?.activity as Record<string, unknown> | undefined) ?? fallbackDraftFromTranscript(transcript);

    try {
      setBusy(true);
      setLastError(null);
      const r = await fetch("/api/activity/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(farmId ? { farmId } : {}), draft, status, transcript, override_reason: overrideReason }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(JSON.stringify(j.error?.details ?? j.error));
      alert(`${status === "final" ? "Finalized" : "Draft saved"}: ${j.record_id}`);
      if (j.farm_id && !farmId) setFarmId(j.farm_id);
    } catch (err) {
      queueOfflineDraft(draft);
      const msg = err instanceof Error ? err.message : "Save failed";
      setLastError(msg);
      alert("Could not save to server right now. Draft stored in offline queue.");
    } finally {
      setBusy(false);
    }
  }

  async function retryPending(item: PendingDraft) {
    const r = await fetch("/api/activity/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(item.farmId ? { farmId: item.farmId } : {}), draft: item.draft, status: "draft", transcript: item.transcript }),
    });
    const j = await r.json();
    if (j.ok) {
      savePending(pending.filter((p) => p.id !== item.id));
      if (j.farm_id && !farmId) setFarmId(j.farm_id);
    } else {
      setLastError(j.error?.message || "retry failed");
      alert(j.error?.message || "retry failed");
    }
  }

  const missing = useMemo(() => parseResult?.missing_fields ?? [], [parseResult]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">FieldLog V2 — Voice to Compliance Record</h1>

        {lastError && <div className="rounded border border-rose-700 bg-rose-900/20 text-rose-200 p-3 text-sm">Last error: {lastError}</div>}

        <div className="rounded border border-zinc-800 p-3">
          <label className="text-sm text-zinc-300">Farm</label>
          <select className="w-full rounded bg-zinc-900 border border-zinc-800 px-3 py-2 mt-1" value={farmId} onChange={(e) => setFarmId(e.target.value)}>
            <option value="">Auto-select/create farm on save</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!recording ? (
            <button className="bg-emerald-600 px-4 py-2 rounded" onClick={startRecording} disabled={busy}>Record voice</button>
          ) : (
            <button className="bg-rose-600 px-4 py-2 rounded" onClick={stopRecording}>Stop recording</button>
          )}
          <button className="bg-zinc-700 px-4 py-2 rounded" onClick={() => transcript && parse(transcript)} disabled={busy || !transcript}>Re-parse transcript</button>
          <button
            className="bg-amber-700 px-4 py-2 rounded"
            onClick={() => {
              queueOfflineDraft((parseResult?.activity as Record<string, unknown> | undefined) ?? fallbackDraftFromTranscript(transcript));
              alert("Draft queued locally.");
            }}
            disabled={busy}
          >
            Queue Draft Offline
          </button>
        </div>

        <div className="rounded border border-zinc-800 p-3">
          <h2 className="font-medium mb-2">Transcript</h2>
          <textarea className="w-full min-h-24 bg-zinc-900 p-2 rounded" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        </div>

        {parseResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded border border-zinc-800 p-3 space-y-2">
              <h2 className="font-medium">Detected Activity Type: {parseResult.activity.type}</h2>
              <pre className="text-xs bg-zinc-900 p-2 rounded overflow-auto">{JSON.stringify(parseResult.activity, null, 2)}</pre>
            </div>
            <div className="rounded border border-zinc-800 p-3 space-y-2">
              <h2 className="font-medium text-amber-300">Missing required fields</h2>
              <ul className="list-disc ml-5 text-sm">{missing.length ? missing.map((m) => <li key={m}>{m}</li>) : <li>None</li>}</ul>
              {parseResult.clarification_question && <p className="text-sm text-amber-200">{parseResult.clarification_question}</p>}
              <textarea className="w-full min-h-16 bg-zinc-900 p-2 rounded" placeholder="Override reason (required if label-range flag occurs)" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
              <div className="flex gap-2">
                <button className="bg-zinc-700 px-3 py-2 rounded" onClick={() => finalize("draft")}>Save Draft</button>
                <button className="bg-emerald-600 px-3 py-2 rounded" onClick={() => finalize("final")}>Finalize Record</button>
              </div>
            </div>
          </div>
        )}

        {!parseResult && (
          <div className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">
            Parser output not available yet. You can still <strong>Save Draft</strong> or <strong>Queue Draft Offline</strong> using transcript-only fallback.
            <div className="mt-2">
              <button className="bg-zinc-700 px-3 py-2 rounded mr-2" onClick={() => finalize("draft")}>Save Draft</button>
              <button className="bg-emerald-600 px-3 py-2 rounded" onClick={() => finalize("final")}>Finalize Record</button>
            </div>
          </div>
        )}

        <div className="rounded border border-zinc-800 p-3">
          <h2 className="font-medium mb-2">Offline queue (pending sync)</h2>
          <ul className="space-y-2 text-sm">
            {pending.map((p) => (
              <li key={p.id} className="bg-zinc-900 p-2 rounded flex justify-between items-center">
                <span>{new Date(p.createdAt).toLocaleString()} — {String(p.draft.type ?? "draft")}</span>
                <button className="bg-zinc-700 px-2 py-1 rounded" onClick={() => retryPending(p)}>Retry upload</button>
              </li>
            ))}
            {pending.length === 0 && <li>No pending drafts.</li>}
          </ul>
        </div>
      </div>
    </main>
  );
}
