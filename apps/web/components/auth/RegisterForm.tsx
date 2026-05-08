"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface Org { id: string; name: string; slug: string }

interface Props { orgs: Org[] }

export function RegisterForm({ orgs }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const register = trpc.auth.register.useMutation();

  function validate() {
    const e: Record<string, string> = {};
    if (!email) e.email = "Email is required";
    if (!name) e.name = "Name is required";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register.mutateAsync({ email, name, password, orgIds: selectedOrgIds });
      router.push("/login?registered=1");
    } catch (err: any) {
      setErrors({ form: err.message ?? "Registration failed" });
    }
  }

  function toggleOrg(id: string) {
    setSelectedOrgIds((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
          Full name
        </label>
        <input
          id="name"
          aria-label="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="Ada Lovelace"
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

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
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="ada@example.com"
        />
        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
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
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="Min 8 characters"
        />
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
      </div>

      {orgs.length > 0 && (
        <div>
          <p className="block text-sm font-medium text-slate-300 mb-2">
            Join organizations <span className="text-slate-500">(optional)</span>
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {orgs.map((org) => (
              <label
                key={org.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                  selectedOrgIds.includes(org.id)
                    ? "border-sky-500 bg-sky-950"
                    : "border-slate-700 hover:border-slate-500"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedOrgIds.includes(org.id)}
                  onChange={() => toggleOrg(org.id)}
                  className="accent-sky-500"
                />
                <span className="text-sm text-slate-200">{org.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {errors.form && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">
          {errors.form}
        </p>
      )}

      <button
        type="submit"
        disabled={register.isPending}
        className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {register.isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
