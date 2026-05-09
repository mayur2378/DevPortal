"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface App {
  id: string;
  name: string;
}

interface Props {
  apiId: string;
  apiName: string;
  apps: App[];
}

const ENVIRONMENTS = ["dev", "test", "stage", "prod"] as const;
type Environment = typeof ENVIRONMENTS[number];

export function SubscriptionRequestForm({ apiId, apiName, apps }: Props) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState(apps[0]?.id ?? "");
  const [environment, setEnvironment] = useState<Environment>("dev");
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const request = trpc.subscription.requestAccess.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => router.push("/my-subscriptions"), 1500);
    },
    onError: (e) => setError(e.message),
  });

  if (apps.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 text-sm mb-4">You need to register an application first.</p>
        <a
          href="/my-apps/register"
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Register Application
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <p className="text-green-400 font-semibold">Access request submitted!</p>
        <p className="text-slate-400 text-sm mt-1">Redirecting to your subscriptions…</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        request.mutate({ applicationId, apiId, environment, comments: comments || undefined });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Application *</label>
        <select
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
          required
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
        >
          {apps.map((app) => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Environment *</label>
        <div className="grid grid-cols-4 gap-2">
          {ENVIRONMENTS.map((env) => (
            <button
              key={env}
              type="button"
              onClick={() => setEnvironment(env)}
              className={`py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                environment === env
                  ? "bg-sky-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Comments</label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          placeholder={`Why do you need access to ${apiName}?`}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={request.isPending || !applicationId}
        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm"
      >
        {request.isPending ? "Submitting…" : "Request Access"}
      </button>
    </form>
  );
}
