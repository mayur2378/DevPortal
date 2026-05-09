import { createCaller } from "@/lib/trpc/server";
import { ApiGrid } from "@/components/catalog/ApiGrid";
import { BrowseFilters } from "@/components/catalog/BrowseFilters";
import Link from "next/link";

interface Props {
  searchParams: {
    org?: string; type?: string; q?: string;
    visibility?: string; domainId?: string;
    tags?: string; lifecycleStatus?: string;
  };
}

export default async function BrowsePage({ searchParams }: Props) {
  const caller = await createCaller();
  const [apis, domains, tags] = await Promise.all([
    caller.api.list({
      orgSlug: searchParams.org,
      type: searchParams.type,
      visibility: searchParams.visibility as any,
      domainId: searchParams.domainId,
      tags: searchParams.tags ? searchParams.tags.split(",") : undefined,
      lifecycleStatus: searchParams.lifecycleStatus,
      search: searchParams.q,
    }),
    caller.admin.domain.list(),
    caller.admin.tag.list(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">API Catalog</h1>
          <p className="text-slate-400 text-sm mt-0.5">{apis.length} API{apis.length !== 1 ? "s" : ""} available</p>
        </div>
        <Link href="/publish" className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          + Publish API
        </Link>
      </div>
      <div className="flex gap-6">
        <aside className="w-56 flex-shrink-0">
          <BrowseFilters domains={domains} tags={tags} />
        </aside>
        <div className="flex-1">
          {searchParams.q && (
            <p className="text-slate-400 text-sm mb-4">Results for <span className="text-white">"{searchParams.q}"</span></p>
          )}
          <ApiGrid apis={apis as any} searchQuery={searchParams.q} />
        </div>
      </div>
    </div>
  );
}
