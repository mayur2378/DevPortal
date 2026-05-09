"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export function AdminApiEditForm({ api }: { api: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    visibility: api.visibility, businessCapability: api.businessCapability ?? "",
    systemOfRecord: api.systemOfRecord ?? "", supportContact: api.supportContact ?? "",
    piiIndicator: api.piiIndicator, phiIndicator: api.phiIndicator,
    gatewayRef: api.gatewayRef ?? "", runtimeEndpoint: api.runtimeEndpoint ?? "",
  });
  const update = trpc.admin.apiManagement.update.useMutation({ onSuccess: () => router.push("/admin/apis") });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); update.mutate({ id: api.id, ...form }); }} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">Visibility</label>
        <select value={form.visibility} onChange={(e) => set("visibility", e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
          {["INTERNAL", "PARTNER", "PUBLIC"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      {(["businessCapability", "systemOfRecord", "supportContact", "gatewayRef", "runtimeEndpoint"] as const).map((field) => (
        <div key={field}>
          <label className="text-sm font-medium text-slate-300 block mb-1">{field.replace(/([A-Z])/g, " $1").trim()}</label>
          <input value={form[field]} onChange={(e) => set(field, e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>
      ))}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.piiIndicator} onChange={(e) => set("piiIndicator", e.target.checked)} className="rounded" />Contains PII</label>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.phiIndicator} onChange={(e) => set("phiIndicator", e.target.checked)} className="rounded" />Contains PHI</label>
      </div>
      <button type="submit" disabled={update.isPending} className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm">{update.isPending ? "Saving..." : "Save Changes"}</button>
    </form>
  );
}
