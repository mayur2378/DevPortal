import Link from "next/link";
import { AppRegistrationForm } from "@/components/onboarding/AppRegistrationForm";

export default function RegisterAppPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link
          href="/my-apps"
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← My Applications
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">Register Application</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-slate-400 text-sm mb-6">
          Register an application to request access to APIs. Each application gets its own
          set of credentials and subscriptions.
        </p>
        <AppRegistrationForm />
      </div>
    </div>
  );
}
