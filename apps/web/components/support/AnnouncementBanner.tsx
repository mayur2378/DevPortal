"use client";
import { useState } from "react";

interface Announcement { id: string; title: string; body: string }
interface Props { announcements: Announcement[] }

export function AnnouncementBanner({ announcements }: Props) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;
  const latest = visible[0];
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-sky-900/40 border-b border-sky-700/40 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-sky-400 shrink-0 mt-0.5">📢</span>
        <div>
          <span className="text-sky-300 font-semibold">{latest.title}: </span>
          <span className="text-sky-200/80">{latest.body}</span>
        </div>
      </div>
      <button type="button" onClick={() => setDismissed((d) => [...d, latest.id])}
        className="text-sky-500 hover:text-sky-300 shrink-0 text-xs">Dismiss</button>
    </div>
  );
}
