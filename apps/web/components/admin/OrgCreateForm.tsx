"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

export function OrgCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const create = trpc.admin.org.create.useMutation({
    onSuccess: () => { setName(""); setSlug(""); router.refresh(); },
    onError: (e) => setError(e.message),
  });
  const autoSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate({ name, slug }); }} className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
      <h2 className="text-base font-semibold text-white mb-4">Create organization</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Name</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setSlug(autoSlug(e.target.value)); }} placeholder="Acme Corp" required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme-corp" required pattern="[a-z0-9-]+" className={inputCls} />
        </div>
      </div>
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      <button type="submit" disabled={create.isPending} className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
        {create.isPending ? "Creating…" : "Create"}
      </button>
    </form>
  );
}
