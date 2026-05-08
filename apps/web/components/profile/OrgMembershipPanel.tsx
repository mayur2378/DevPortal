"use client";

import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface Membership {
  org: { id: string; name: string; slug: string };
  role: "MEMBER" | "ADMIN";
}

interface Props {
  memberships: Membership[];
  allOrgs: { id: string; name: string; slug: string }[];
}

export function OrgMembershipPanel({ memberships, allOrgs }: Props) {
  const router = useRouter();
  const myOrgIds = new Set(memberships.map((m) => m.org.id));
  const joinable = allOrgs.filter((o) => !myOrgIds.has(o.id));

  const leave = trpc.org.leave.useMutation({ onSuccess: () => router.refresh() });
  const join = trpc.org.join.useMutation({ onSuccess: () => router.refresh() });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Your organizations</h3>
        {memberships.length === 0 ? (
          <p className="text-slate-500 text-sm italic">You haven&apos;t joined any organizations yet.</p>
        ) : (
          <ul className="space-y-2">
            {memberships.map(({ org, role }) => (
              <li
                key={org.id}
                className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{org.name}</p>
                  <p className="text-xs text-slate-400">{role}</p>
                </div>
                <button
                  onClick={() => leave.mutate({ orgId: org.id })}
                  disabled={leave.isPending}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  Leave
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {joinable.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Join an organization</h3>
          <ul className="space-y-2">
            {joinable.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3"
              >
                <p className="text-sm font-medium text-white">{org.name}</p>
                <button
                  onClick={() => join.mutate({ orgId: org.id })}
                  disabled={join.isPending}
                  className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
