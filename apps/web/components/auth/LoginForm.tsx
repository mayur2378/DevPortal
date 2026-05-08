"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push("/browse");
    } else {
      setError("Invalid email or password.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {params.get("registered") && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-sm px-3 py-2 rounded-lg">
          Account created — sign in to continue.
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
          Email
        </label>
        <input
          id="email"
          aria-label="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="ada@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
          Password
        </label>
        <input
          id="password"
          aria-label="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
