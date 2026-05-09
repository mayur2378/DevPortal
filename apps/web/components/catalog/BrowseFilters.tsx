"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterPanel, CatalogFilters } from "./FilterPanel";

interface Props {
  domains: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}

export function BrowseFilters({ domains, tags }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current: CatalogFilters = {
    visibility: searchParams.get("visibility") ?? undefined,
    domainId: searchParams.get("domainId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    lifecycleStatus: searchParams.get("lifecycleStatus") ?? undefined,
    tags: searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
  };

  const handleChange = (f: CatalogFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    const set = (k: string, v: string | undefined) => v ? params.set(k, v) : params.delete(k);
    set("visibility", f.visibility);
    set("domainId", f.domainId);
    set("type", f.type);
    set("lifecycleStatus", f.lifecycleStatus);
    if (f.tags?.length) params.set("tags", f.tags.join(","));
    else params.delete("tags");
    router.push(`/browse?${params.toString()}`);
  };

  return <FilterPanel domains={domains} tags={tags} filters={current} onChange={handleChange} />;
}
