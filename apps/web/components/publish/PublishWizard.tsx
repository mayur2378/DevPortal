"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { StepMetadata } from "./StepMetadata";
import { StepSpecUpload } from "./StepSpecUpload";
import { StepDocPages } from "./StepDocPages";
interface Org { id: string; name: string; slug: string }
export function PublishWizard({ orgs, orgSlugMap }: { orgs: Org[]; orgSlugMap: Record<string, string> }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({ orgId: "", name: "", slug: "", type: "REST", description: "", category: "" });
  const [spec, setSpec] = useState({ specKey: "", version: "1.0.0" });
  const [docPages, setDocPages] = useState<{ slug: string; title: string; content: string }[]>([]);
  const createApi = trpc.api.create.useMutation();
  const createVersion = trpc.apiVersion.create.useMutation();
  const upsertDoc = trpc.apiVersion.docPage.upsert.useMutation();
  const publish = trpc.apiVersion.publish.useMutation();
  const [submitting, setSubmitting] = useState(false);
  async function handlePublish() {
    setSubmitting(true);
    try {
      const api = await createApi.mutateAsync({ orgId: meta.orgId, name: meta.name, slug: meta.slug, type: meta.type as "REST" | "GRAPHQL", description: meta.description || undefined, category: meta.category || undefined });
      const version = await createVersion.mutateAsync({ apiId: api.id, version: spec.version, specKey: spec.specKey, specType: meta.type as "REST" | "GRAPHQL" });
      for (let i = 0; i < docPages.length; i++) { await upsertDoc.mutateAsync({ apiVersionId: version.id, ...docPages[i], order: i }); }
      await publish.mutateAsync({ versionId: version.id });
      const orgSlug = orgSlugMap[meta.orgId];
      router.push(`/api/${orgSlug}/${meta.slug}/${spec.version}/docs`);
    } catch (err: any) { alert(err.message ?? "Failed to publish. Please try again."); setSubmitting(false); }
  }
  return (
    <div className="max-w-2xl">
      <div className="flex gap-2 mb-8">
        {["Details", "Spec", "Docs"].map((label, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? "bg-sky-500" : "bg-slate-800"}`} />
        ))}
      </div>
      {step === 0 && <StepMetadata orgs={orgs} value={meta} onChange={setMeta} onNext={() => setStep(1)} />}
      {step === 1 && <StepSpecUpload value={spec} onChange={setSpec} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && <StepDocPages pages={docPages} onChange={setDocPages} onSubmit={handlePublish} onBack={() => setStep(1)} submitting={submitting} />}
    </div>
  );
}
