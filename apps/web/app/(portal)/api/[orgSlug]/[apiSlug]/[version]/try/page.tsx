import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { MockTester } from "@/components/api-detail/MockTester";
import { extractOperations } from "@/lib/spec-utils";
import { readSpec } from "@devportal/db";
import yaml from "js-yaml";

interface Props {
  params: { orgSlug: string; apiSlug: string; version: string };
}

export default async function TryItPage({ params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  const publishedVersion = api.versions.find((v) => v.version === params.version);
  if (!publishedVersion) notFound();

  const versionFull = await caller.apiVersion.getSpecContent({ versionId: publishedVersion.id });
  let operations: ReturnType<typeof extractOperations> = [];

  if (api.type === "REST") {
    const buffer = await readSpec(versionFull.specKey);
    const text = buffer.toString("utf8");
    const spec = (text.trim().startsWith("{") ? JSON.parse(text) : yaml.load(text)) as any;
    operations = extractOperations(spec ?? {});
  }

  return (
    <MockTester
      operations={operations}
      versionId={publishedVersion.id}
      specType={api.type as "REST" | "GRAPHQL"}
    />
  );
}
