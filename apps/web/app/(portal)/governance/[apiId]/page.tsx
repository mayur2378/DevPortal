import { createCaller } from "@/lib/trpc/server";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { GovernanceScoreCard } from "@/components/governance/GovernanceScoreCard";
import { ChecklistPanel } from "@/components/governance/ChecklistPanel";
import { LintingReport } from "@/components/governance/LintingReport";
import { DataClassificationPanel } from "@/components/governance/DataClassificationPanel";
import { lintApi } from "@/lib/governance-linter";
import { canReviewGovernance } from "@/lib/rbac";

export default async function GovernanceReviewPage({ params }: { params: { apiId: string } }) {
  const [caller, session] = await Promise.all([createCaller(), auth()]);
  const [score, checklistItems, apiData] = await Promise.all([
    caller.governance.getApiScore({ apiId: params.apiId }),
    caller.governance.getChecklistItems(),
    caller.admin.apiManagement.getById({ id: params.apiId }).catch(() => null),
  ]);
  if (!apiData) return notFound();

  const lintResult = lintApi({
    name: apiData.name, slug: apiData.slug, description: apiData.description,
    type: apiData.type, visibility: apiData.visibility, supportContact: apiData.supportContact,
    specKey: apiData.versions[0]?.specKey, specUrl: apiData.versions[0]?.specUrl,
    piiIndicator: apiData.piiIndicator, dataClassification: apiData.dataClassification,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{apiData.name} — Governance Review</h1>
        <p className="text-slate-400 text-sm mt-1">{apiData.org.name}</p>
      </div>
      <GovernanceScoreCard score={score.score} passed={score.passed} total={score.total} />
      <DataClassificationPanel
        dataClassification={apiData.dataClassification ?? "INTERNAL"}
        piiIndicator={apiData.piiIndicator ?? false}
        phiIndicator={apiData.phiIndicator ?? false}
        visibility={apiData.visibility ?? "INTERNAL"}
      />
      <LintingReport result={lintResult} />
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Governance Checklist</h2>
        <ChecklistPanel
          apiId={params.apiId}
          items={checklistItems}
          existingReviews={score.reviews as any}
          canReview={canReviewGovernance(session as any)}
        />
      </div>
    </div>
  );
}
