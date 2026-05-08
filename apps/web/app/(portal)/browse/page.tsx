import { createCaller } from "@/lib/trpc/server";
import { ApiGrid } from "@/components/catalog/ApiGrid";
import Link from "next/link";

interface Props {
  searchParams: { org?: string; type?: string; q?: string };
}

export default async function BrowsePage({ searchParams }: Props) {
  const caller = await createCaller();
  const apis = await caller.api.list({
    orgSlug: searchParams.org,
    type: searchParams.type as "REST" | "GRAPHQL" | undefined,
    search: searchParams.q,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">API Catalog</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {apis.length} API{apis.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Link
          href="/publish"
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Publish API
        </Link>
      </div>

      {searchParams.q && (
        <p className="text-slate-400 text-sm mb-4">
          Results for <span className="text-white">"{searchParams.q}"</span>
        </p>
      )}

      <ApiGrid apis={apis as any} searchQuery={searchParams.q} />
    </div>
  );
}
