import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { SpecExplorer } from "@/components/api-detail/SpecExplorer";
import { DocMetaFields } from "@/components/api-detail/DocMetaFields";
import { AsyncAPIRenderer } from "@/components/api-detail/AsyncAPIRenderer";
import { CommentThread } from "@/components/support/CommentThread";
import { auth } from "@/lib/auth";

interface Props { params: { orgSlug: string; apiSlug: string; version: string } }

const ASYNC_TYPES = ["ASYNC_API", "EVENT", "WEBHOOK"];

export default async function ReferencePage({ params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  const publishedVersion = api.versions.find((v) => v.version === params.version);
  if (!publishedVersion) notFound();

  const [apiVersion, comments, session] = await Promise.all([
    caller.apiVersion.getSpecContent({ versionId: publishedVersion.id }).catch(() => null),
    caller.support.getComments({ apiId: api.id }),
    auth(),
  ]);

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
      <div className="mt-10 pt-8 border-t border-slate-700/50">
        <CommentThread apiId={api.id} initialComments={comments as any} currentUserId={session?.user?.id} />
      </div>
    </div>
  );
}
