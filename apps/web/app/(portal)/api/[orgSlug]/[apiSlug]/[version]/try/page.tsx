import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { MockTester } from "@/components/api-detail/MockTester";
import { PostmanExporter } from "@/components/api-detail/PostmanExporter";
import { CurlExamples } from "@/components/api-detail/CurlExamples";
import { SamplePayloads } from "@/components/api-detail/SamplePayloads";
import { extractOperations } from "@/lib/spec-utils";
import { generateCurlExamples } from "@/lib/curl-generator";
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
  let spec: any = null;

  if (api.type === "REST" && versionFull.specKey) {
    const buffer = await readSpec(versionFull.specKey);
    const text = buffer.toString("utf8");
    spec = (text.trim().startsWith("{") ? JSON.parse(text) : yaml.load(text)) as any;
    operations = extractOperations(spec ?? {});
  }

  const curlExamples = spec ? generateCurlExamples(spec, process.env.MOCK_ENGINE_URL ?? "http://localhost:3001") : [];

  const samplePayloads = spec ? Object.entries(spec.paths ?? {}).flatMap(([path, methods]: [string, any]) =>
    Object.entries(methods).map(([method, op]: [string, any]) => ({
      operationId: op.operationId ?? `${method}-${path}`,
      method: method.toUpperCase(), path,
      request: op.requestBody?.content?.["application/json"]?.example,
      response: op.responses?.["200"]?.content?.["application/json"]?.example,
    }))
  ) : [];

  return (
    <>
      <MockTester
        operations={operations}
        versionId={publishedVersion.id}
        specType={api.type as "REST" | "GRAPHQL"}
      />
      <div className="mt-8 space-y-6">
        <PostmanExporter versionId={publishedVersion.id} apiName={api.name} />
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">cURL Examples</h2>
          <CurlExamples examples={curlExamples} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Sample Payloads</h2>
          <SamplePayloads payloads={samplePayloads} />
        </div>
      </div>
    </>
  );
}
