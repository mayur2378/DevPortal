import { createCaller } from "@/lib/trpc/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MockCredentials } from "@/components/onboarding/MockCredentials";

export default async function MyAppsPage() {
  const caller = await createCaller();
  let apps;
  try {
    apps = await caller.application.list();
  } catch {
    redirect("/login");
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Applications</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {apps.length} application{apps.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link
          href="/my-apps/register"
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Register Application
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-400 text-sm mb-4">No applications registered yet.</p>
          <Link
            href="/my-apps/register"
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Register your first application
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div>
                <h2 className="text-base font-semibold text-white">{app.name}</h2>
                {app.description && (
                  <p className="text-slate-400 text-sm mt-1">{app.description}</p>
                )}
              </div>

              <div className="text-xs text-slate-500">
                {app.subscriptions.length} subscription{app.subscriptions.length !== 1 ? "s" : ""}
              </div>

              <MockCredentials
                clientId={`demo-${app.id.slice(0, 8)}`}
                clientSecret={`secret-${app.id.slice(-12)}`}
              />

              <div className="flex gap-2 pt-1">
                <Link
                  href={`/browse`}
                  className="flex-1 text-center text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-1.5 rounded-lg transition-colors"
                >
                  Subscribe to API
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
