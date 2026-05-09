"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function SupportTicketForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submit = trpc.support.submitTicket.useMutation({ onSuccess: () => { setSubject(""); setBody(""); setSubmitted(true); } });
  if (submitted) return (
    <div className="p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-xl">
      <p className="text-emerald-300 font-semibold">✓ Ticket submitted</p>
      <p className="text-emerald-400/80 text-sm mt-1">We'll review your request and respond via email.</p>
      <button type="button" onClick={() => setSubmitted(false)} className="text-xs text-emerald-500 mt-2 hover:text-emerald-400">Submit another</button>
    </div>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit.mutate({ subject, body }); }} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3}
          placeholder="Briefly describe your issue"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">Description</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} rows={5}
          placeholder="Describe your issue in detail..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" />
      </div>
      {submit.error && <p className="text-red-400 text-sm">{submit.error.message}</p>}
      <button type="submit" disabled={submit.isPending}
        className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm">
        {submit.isPending ? "Submitting..." : "Submit Ticket"}
      </button>
    </form>
  );
}
