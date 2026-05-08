"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/browse", label: "Browse APIs" },
  { href: "/my-apis", label: "My APIs" },
];

interface TopNavProps {
  role?: string;
}

export function TopNav({ role }: TopNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-8">
      <Link href="/browse" className="flex items-center gap-2 text-sky-400 font-bold text-lg shrink-0">
        ⬡ <span>DevPortal</span>
      </Link>

      <nav className="flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname.startsWith(link.href)
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            {link.label}
          </Link>
        ))}
        {role === "SUPERADMIN" && (
          <Link
            href="/admin"
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-amber-950 text-amber-400"
                : "text-amber-400/70 hover:text-amber-400 hover:bg-amber-950/50"
            )}
          >
            Admin
          </Link>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {session?.user && (
          <>
            <span className="text-slate-400 text-sm">{session.user.name}</span>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold hover:bg-sky-500 transition-colors"
            >
              {session.user.name?.[0]?.toUpperCase() ?? "U"}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
