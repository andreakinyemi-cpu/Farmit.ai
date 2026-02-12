"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ChatMsg = { role: "user" | "assistant"; text: string };

export default function Home() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, message: text }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${data.error ?? "Unknown error"}` }]);
      setLoading(false);
      return;
    }

    setConversationId(data.conversationId);
    setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <div className="max-w-3xl w-full mx-auto px-4 py-6 flex-1">
        <h1 className="text-xl font-semibold mb-2">FarmGPT + FieldLog V2</h1>
        <p className="text-sm text-zinc-400 mb-4 space-x-3">
          <Link className="underline" href="/fieldlog">Voice Record</Link>
          <Link className="underline" href="/settings/farm">Farm Settings</Link>
          <Link className="underline" href="/records">Records</Link>
        </p>

        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={"inline-block max-w-[85%] rounded-2xl px-4 py-2 " + (m.role === "user" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-100")}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-left">
              <div className="inline-block rounded-2xl px-4 py-2 bg-zinc-800">Thinking…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-zinc-800">
        <div className="max-w-3xl w-full mx-auto px-4 py-4 flex gap-2">
          <input className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 outline-none" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Ask about soil, crops, livestock, sustainability…" />
          <button className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold disabled:opacity-50" onClick={send} disabled={loading}>Send</button>
        </div>
      </div>
    </main>
  );
}
