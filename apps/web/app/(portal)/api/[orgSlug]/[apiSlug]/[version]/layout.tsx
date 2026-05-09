import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VersionSwitcher } from "@/components/api-detail/VersionSwitcher";
import { ApiTabs } from "@/components/api-detail/ApiTabs";

interface Props {
  children: React.ReactNode;
  params: { orgSlug: string; apiSlug: string; version: string };
}

export default async function ApiVersionLayout({ children, params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-slate-500 mb-1">{api.org.name}</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{api.name}</h1>
            {api.description && <p className="text-slate-400 text-sm mt-1">{api.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/subscribe/${api.id}`}
              className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Request Access
            </Link>
            <VersionSwitcher
              versions={api.versions as any}
              currentVersion={params.version}
              orgSlug={params.orgSlug}
              apiSlug={params.apiSlug}
            />
          </div>
        </div>
      </div>
      <ApiTabs orgSlug={params.orgSlug} apiSlug={params.apiSlug} version={params.version} />
      {children}
    </div>
  );
}
