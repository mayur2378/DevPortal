import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { SpecExplorer } from "@/components/api-detail/SpecExplorer";

interface Props { params: { orgSlug: string; apiSlug: string; version: string } }

export default async function ReferencePage({ params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  const publishedVersion = api.versions.find((v) => v.version === params.version);
  if (!publishedVersion) notFound();

  return <SpecExplorer versionId={publishedVersion.id} specType={api.type as "REST" | "GRAPHQL"} />;
}
