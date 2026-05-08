import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { DocPageRenderer } from "@/components/api-detail/DocPageRenderer";
import { DocPageNav } from "@/components/api-detail/DocPageNav";

interface Props { params: { orgSlug: string; apiSlug: string; version: string; slug?: string[] } }

export default async function DocsPage({ params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  const publishedVersion = api.versions.find((v) => v.version === params.version);
  if (!publishedVersion) notFound();

  const pages = await caller.apiVersion.docPage.list({ apiVersionId: publishedVersion.id });
  const currentSlug = params.slug?.[0] ?? pages[0]?.slug;
  const page = pages.find((p) => p.slug === currentSlug);

  return (
    <div className="flex gap-8">
      <DocPageNav pages={pages} currentSlug={currentSlug ?? ""} orgSlug={params.orgSlug} apiSlug={params.apiSlug} version={params.version} />
      <div className="flex-1 min-w-0">
        {page ? (
          <>
            <h2 className="text-xl font-bold text-white mb-4">{page.title}</h2>
            <DocPageRenderer content={page.content} />
          </>
        ) : (
          <p className="text-slate-400 italic">No documentation pages yet.</p>
        )}
      </div>
    </div>
  );
}
