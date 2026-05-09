import { LintResult } from "@/lib/governance-linter";

export function LintingReport({ result }: { result: LintResult }) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Automated Lint Check</p>
        <span className={`text-lg font-black ${result.score >= 80 ? "text-emerald-400" : result.score >= 60 ? "text-amber-400" : "text-red-400"}`}>
          {result.score}/100
        </span>
      </div>
      {result.issues.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase mb-1">Issues</p>
          <ul className="space-y-1">
            {result.issues.map((i, idx) => <li key={idx} className="text-sm text-red-300 flex gap-2"><span>✗</span>{i}</li>)}
          </ul>
        </div>
      )}
      {result.warnings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-400 uppercase mb-1">Warnings</p>
          <ul className="space-y-1">
            {result.warnings.map((w, idx) => <li key={idx} className="text-sm text-amber-300 flex gap-2"><span>⚠</span>{w}</li>)}
          </ul>
        </div>
      )}
      {result.issues.length === 0 && result.warnings.length === 0 && (
        <p className="text-emerald-400 text-sm">✓ All automated checks passed</p>
      )}
    </div>
  );
}
