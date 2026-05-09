import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { SpecExplorer } from "@/components/api-detail/SpecExplorer";
import { DocMetaFields } from "@/components/api-detail/DocMetaFields";
import { AsyncAPIRenderer } from "@/components/api-detail/AsyncAPIRenderer";

interface Props { params: { orgSlug: string; apiSlug: string; version: string } }

const ASYNC_TYPES = ["ASYNC_API", "EVENT", "WEBHOOK"];

export default async function ReferencePage({ params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  const publishedVersion = api.versions.find((v) => v.version === params.version);
  if (!publishedVersion) notFound();

  const apiVersion = await caller.apiVersion.getSpecContent({ versionId: publishedVersion.id }).catch(() => null);

  const isAsync = ASYNC_TYPES.includes(api.type as string);

  return (
    <div>
      {apiVersion && (
        <DocMetaFields
          authMethod={apiVersion.authMethod}
          rateLimitPolicy={apiVersion.rateLimitPolicy}
          slaInfo={apiVersion.slaInfo}
        />
      )}
      {isAsync && apiVersion?.specKey ? (
        <AsyncAPIRenderer spec={apiVersion.specKey} />
      ) : (
        <SpecExplorer versionId={publishedVersion.id} specType={api.type as "REST" | "GRAPHQL"} />
      )}
    </div>
  );
}
