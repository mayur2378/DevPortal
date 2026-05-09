"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const APPROVER_ROLES = ["SUPERADMIN", "API_PRODUCT_OWNER", "API_DEVELOPER"];

interface SidebarProps {
  orgs: { id: string; name: string; slug: string }[];
  role?: string;
}

export function Sidebar({ orgs, role }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedOrg = searchParams.get("org");

  function orgHref(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("org", slug);
    return `${pathname}?${params.toString()}`;
  }

  function clearHref() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("org");
    return `${pathname}?${params.toString()}`;
  }

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-56 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4">
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Organizations
        </p>
        <ul className="space-y-0.5">
          <li>
            <Link
              href={clearHref()}
              className={cn(
                "block px-3 py-1.5 rounded-md text-sm transition-colors",
                !selectedOrg
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              All orgs
            </Link>
          </li>
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={orgHref(org.slug)}
                className={cn(
                  "block px-3 py-1.5 rounded-md text-sm transition-colors",
                  selectedOrg === org.slug
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                {org.name}
              </Link>
            </li>
          ))}
          {orgs.length === 0 && (
            <li className="px-3 py-1.5 text-slate-600 text-sm italic">No orgs yet</li>
          )}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Type
        </p>
        <ul className="space-y-0.5">
          {["REST", "GraphQL"].map((type) => (
            <li key={type}>
              <Link
                href={`${pathname}?type=${type}`}
                className="block px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {type}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Developer
        </p>
        <ul className="space-y-0.5">
          {[
            { href: "/my-apps", label: "My Applications" },
            { href: "/my-subscriptions", label: "My Subscriptions" },
            ...(role && APPROVER_ROLES.includes(role) ? [{ href: "/approvals", label: "Approval Queue" }] : []),
            { href: "/governance", label: "Governance" },
            { href: "/lifecycle", label: "Lifecycle" },
            { href: "/analytics", label: "Analytics" },
            { href: "/support", label: "Support" },
            { href: "/products", label: "API Products" },
          ].map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "block px-3 py-1.5 rounded-md text-sm transition-colors",
                  pathname === href
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
