"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
export function AppRegistrationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const create = trpc.application.create.useMutation({ onSuccess: () => router.push("/my-apps"), onError: (e) => setError(e.message) });
  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate({ name, description }); }} className="space-y-4">
      <div><label className="block text-sm font-medium text-slate-300 mb-1">App Name *</label><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="My Integration App" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" /></div>
      <div><label className="block text-sm font-medium text-slate-300 mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What does this app do?" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" /></div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={create.isPending} className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">{create.isPending ? "Registering..." : "Register Application"}</button>
    </form>
  );
}
