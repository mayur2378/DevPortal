import { StatusBadge } from "@/components/ui/StatusBadge";

interface Version {
  id: string; version: string; lifecycleStatus: string;
  changelog?: string | null; releaseNotes?: string | null;
  maturityScore?: number | null; createdAt: Date;
}
interface Props { versions: Version[] }

export function ChangelogPanel({ versions }: Props) {
  return (
    <div className="space-y-4">
      {versions.map((v) => (
        <div key={v.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold font-mono text-sm">v{v.version}</span>
              <StatusBadge status={v.lifecycleStatus} />
            </div>
            <div className="flex items-center gap-3">
              {v.maturityScore !== null && v.maturityScore !== undefined && (
                <span className="text-xs text-slate-400">Maturity: <span className="text-white font-semibold">{v.maturityScore}%</span></span>
              )}
              <span className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {v.changelog && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Changelog</p>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{v.changelog}</p>
            </div>
          )}
          {v.releaseNotes && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Release Notes</p>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{v.releaseNotes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
