"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface Props {
  user: { id: string; name: string; email: string };
}

export function ProfileForm({ user }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const update = trpc.user.profile.update.useMutation({
    onSuccess: () => { setMsg("Profile updated."); router.refresh(); },
  });
  const changePassword = trpc.user.profile.changePassword.useMutation({
    onSuccess: () => { setMsg("Password changed."); setCurrentPassword(""); setNewPassword(""); },
    onError: (e) => setMsg(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Account details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              value={user.email}
              disabled
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm opacity-60 cursor-not-allowed"
            />
          </div>
          <button
            onClick={() => update.mutate({ name })}
            disabled={update.isPending || name === user.name}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Change password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => changePassword.mutate({ currentPassword, newPassword })}
            disabled={changePassword.isPending || !currentPassword || newPassword.length < 8}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Change password
          </button>
        </div>
      </div>

      {msg && <p className="text-emerald-400 text-sm">{msg}</p>}
    </div>
  );
}
