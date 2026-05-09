import { createCaller } from "@/lib/trpc/server";
import { GovernanceScoreCard } from "@/components/governance/GovernanceScoreCard";
import Link from "next/link";

export default async function GovernanceDashboardPage() {
  const caller = await createCaller();
  const apis = await caller.governance.getDashboard();

  const scoredApis = apis.filter((a) => a.governanceScore !== null);
  const avgScore = scoredApis.length > 0 ? Math.round(scoredApis.reduce((sum: number, a: any) => sum + (a.governanceScore ?? 0), 0) / scoredApis.length) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Governance Dashboard</h1>
      <p className="text-slate-400 text-sm mb-6">API quality scores across the catalog</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-3xl font-black text-white">{apis.length}</p>
          <p className="text-slate-400 text-sm mt-1">Total APIs</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-3xl font-black text-emerald-400">{avgScore}%</p>
          <p className="text-slate-400 text-sm mt-1">Avg Governance Score</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-3xl font-black text-amber-400">{apis.filter((a) => (a.governanceScore ?? 100) < 60).length}</p>
          <p className="text-slate-400 text-sm mt-1">APIs below 60%</p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80">
            <tr>
              {["API", "Type", "Domain", "Status", "Score", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {apis.map((api) => (
              <tr key={api.id} className="hover:bg-slate-800/20">
                <td className="px-4 py-3 text-white font-medium">{api.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{api.type}</td>
                <td className="px-4 py-3 text-slate-400">{api.domain?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {api.versions[0] && <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">{api.versions[0].lifecycleStatus}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${api.governanceScore === null ? "text-slate-500" : api.governanceScore >= 80 ? "text-emerald-400" : api.governanceScore >= 60 ? "text-amber-400" : "text-red-400"}`}>
                    {api.governanceScore !== null ? `${api.governanceScore}%` : "Not reviewed"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/governance/${api.id}`} className="text-sky-400 hover:text-sky-300 text-xs">Review →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
