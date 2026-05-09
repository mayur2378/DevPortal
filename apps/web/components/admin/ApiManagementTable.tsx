"use client";
import { VisibilityChip } from "@/components/ui/VisibilityChip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

interface Api { id: string; name: string; type: string; visibility: string; domain?: { name: string } | null; org: { name: string }; versions: { lifecycleStatus: string }[] }
interface Props { apis: Api[] }

export function ApiManagementTable({ apis }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/50">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/80">
          <tr>{["Name", "Org", "Type", "Visibility", "Domain", "Status", ""].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {apis.map((api) => (
            <tr key={api.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3 text-white font-medium">{api.name}</td>
              <td className="px-4 py-3 text-slate-400">{api.org.name}</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-700 text-slate-300">{api.type}</span></td>
              <td className="px-4 py-3"><VisibilityChip visibility={api.visibility} /></td>
              <td className="px-4 py-3 text-slate-400">{api.domain?.name ?? "—"}</td>
              <td className="px-4 py-3">{api.versions[0] && <StatusBadge status={api.versions[0].lifecycleStatus} />}</td>
              <td className="px-4 py-3"><Link href={`/admin/apis/${api.id}`} className="text-sky-400 hover:text-sky-300 text-xs">Edit →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
