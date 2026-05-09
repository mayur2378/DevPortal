"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const STATUSES = ["DRAFT", "BETA", "ACTIVE", "DEPRECATED", "RETIRED"] as const;
type LifecycleStatus = typeof STATUSES[number];

interface Version {
  id: string;
  version: string;
  lifecycleStatus: string;
}

interface Props {
  versions: Version[];
  apiId: string;
}

export function LifecycleStatusForm({ versions, apiId }: Props) {
  const router = useRouter();
  const [selectedVersionId, setSelectedVersionId] = useState(versions[0]?.id ?? "");
  const [status, setStatus] = useState<LifecycleStatus>(
    (versions[0]?.lifecycleStatus as LifecycleStatus) ?? "ACTIVE"
  );
  const [changelog, setChangelog] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = trpc.lifecycle.updateVersionLifecycle.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setChangelog("");
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);

  return (
    <div className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <h2 className="text-base font-semibold text-white mb-4">Update Lifecycle Status</h2>

      <div className="space-y-4">
        {versions.length > 1 && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Version</label>
            <select
              value={selectedVersionId}
              onChange={(e) => {
                setSelectedVersionId(e.target.value);
                const v = versions.find((v) => v.id === e.target.value);
                if (v) setStatus(v.lifecycleStatus as LifecycleStatus);
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>v{v.version} — {v.lifecycleStatus}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">New Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  status === s
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-slate-700 border-slate-600 text-slate-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Changelog note (optional)</label>
          <textarea
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={2}
            placeholder="Describe what changed..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">Status updated successfully.</p>}

        <button
          type="button"
          disabled={update.isPending || !selectedVersionId || status === selectedVersion?.lifecycleStatus}
          onClick={() =>
            update.mutate({
              versionId: selectedVersionId,
              lifecycleStatus: status,
              changelog: changelog || undefined,
            })
          }
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {update.isPending ? "Updating..." : "Update Status"}
        </button>
      </div>
    </div>
  );
}
