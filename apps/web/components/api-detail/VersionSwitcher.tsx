"use client";

import { useRouter } from "next/navigation";

interface Props {
  versions: { id: string; version: string }[];
  currentVersion: string;
  orgSlug: string;
  apiSlug: string;
}

export function VersionSwitcher({ versions, currentVersion, orgSlug, apiSlug }: Props) {
  const router = useRouter();

  return (
    <select
      value={currentVersion}
      onChange={(e) => router.push(`/api/${orgSlug}/${apiSlug}/${e.target.value}/docs`)}
      className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
    >
      {versions.map((v) => (
        <option key={v.id} value={v.version}>
          v{v.version}
        </option>
      ))}
    </select>
  );
}
