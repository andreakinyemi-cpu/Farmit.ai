"use client";

import { useEffect, useState } from "react";

type Farm = { id: string; name: string };

export default function FarmSettingsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [name, setName] = useState("");
  const [farmId, setFarmId] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [acreage, setAcreage] = useState("10");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("worker");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/farms");
      const j = await r.json();
      if (j.ok) {
        const farmRows = (j.farms ?? []) as Farm[];
        setFarms(farmRows);
        if (farmRows[0]) setFarmId((prev) => prev || farmRows[0].id);
      }
    })();
  }, []);

  async function createFarm() {
    const r = await fetch("/api/farms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = await r.json();
    if (j.ok) {
      setName("");
      setFarms((prev) => [j.farm as Farm, ...prev]);
      if (!farmId) setFarmId(j.farm.id as string);
    }
  }

  async function addField() {
    await fetch("/api/fields", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ farmId, name: fieldName, acreage: Number(acreage) }),
    });
    setFieldName("");
  }

  async function addUser() {
    await fetch("/api/farm-users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ farmId, email, role }),
    });
    setEmail("");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6"><div className="max-w-3xl mx-auto space-y-4"><h1 className="text-2xl font-semibold">Farm Settings</h1>
      <div className="rounded border border-zinc-800 p-3 space-y-2"><h2 className="font-medium">Create farm</h2><input className="w-full bg-zinc-900 rounded p-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Farm name" /><button className="bg-emerald-600 px-3 py-2 rounded" onClick={createFarm}>Create farm</button></div>
      <div className="rounded border border-zinc-800 p-3 space-y-2"><h2 className="font-medium">Select farm</h2><select className="w-full bg-zinc-900 rounded p-2" value={farmId} onChange={(e) => setFarmId(e.target.value)}><option value="">Select farm</option>{farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
      <div className="rounded border border-zinc-800 p-3 space-y-2"><h2 className="font-medium">Add field</h2><input className="w-full bg-zinc-900 rounded p-2" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="Field name" /><input className="w-full bg-zinc-900 rounded p-2" value={acreage} onChange={(e) => setAcreage(e.target.value)} placeholder="Acreage" /><button className="bg-zinc-700 px-3 py-2 rounded" onClick={addField}>Add field</button></div>
      <div className="rounded border border-zinc-800 p-3 space-y-2"><h2 className="font-medium">Add user to farm</h2><input className="w-full bg-zinc-900 rounded p-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="User email" /><select className="w-full bg-zinc-900 rounded p-2" value={role} onChange={(e) => setRole(e.target.value)}><option value="owner">owner</option><option value="manager">manager</option><option value="worker">worker</option><option value="auditor">auditor</option></select><button className="bg-zinc-700 px-3 py-2 rounded" onClick={addUser}>Add user</button></div>
    </div></main>
  );
}
