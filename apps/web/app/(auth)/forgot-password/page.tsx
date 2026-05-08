"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const forgot = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-emerald-400 mb-4">If that email exists, we've sent a reset link.</p>
        <Link href="/login" className="text-sky-400 hover:text-sky-300 text-sm">Back to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-2">Reset your password</h1>
      <p className="text-slate-400 text-sm mb-6">Enter your email and we'll send a reset link.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          forgot.mutate({ email });
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="ada@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={forgot.isPending}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {forgot.isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-center mt-6">
        <Link href="/login" className="text-sky-400 hover:text-sky-300 text-sm">Back to sign in</Link>
      </p>
    </>
  );
}
