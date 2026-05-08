"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface Org { id: string; name: string; slug: string; createdAt: Date; _count: { memberships: number; apis: number } }

export function OrgTable({ orgs }: { orgs: Org[] }) {
  const router = useRouter();
  const archive = trpc.admin.org.archive.useMutation({ onSuccess: () => router.refresh() });
  if (orgs.length === 0) return <p className="text-slate-500 text-sm italic">No organizations yet. Create one above.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-800 text-left">
          <th className="pb-2 text-xs font-medium text-slate-500 pr-6">Name</th>
          <th className="pb-2 text-xs font-medium text-slate-500 pr-6">Slug</th>
          <th className="pb-2 text-xs font-medium text-slate-500 pr-6">Members</th>
          <th className="pb-2 text-xs font-medium text-slate-500 pr-6">APIs</th>
          <th className="pb-2 text-xs font-medium text-slate-500"></th>
        </tr>
      </thead>
      <tbody>
        {orgs.map((org) => (
          <tr key={org.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="py-3 pr-6"><Link href={`/admin/orgs/${org.id}`} className="text-white hover:text-sky-400 transition-colors font-medium">{org.name}</Link></td>
            <td className="py-3 pr-6 text-slate-400 font-mono text-xs">{org.slug}</td>
            <td className="py-3 pr-6 text-slate-400">{org._count.memberships}</td>
            <td className="py-3 pr-6 text-slate-400">{org._count.apis}</td>
            <td className="py-3">
              <button onClick={() => { if (confirm(`Archive "${org.name}"? This cannot be undone.`)) archive.mutate({ id: org.id }); }} className="text-xs text-red-400 hover:text-red-300 transition-colors">Archive</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
