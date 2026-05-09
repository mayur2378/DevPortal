export interface LintInput {
  name: string;
  slug: string;
  description?: string | null;
  type: string;
  visibility: string;
  supportContact?: string | null;
  specKey?: string | null;
  specUrl?: string | null;
  piiIndicator?: boolean;
  dataClassification?: string | null;
}

export interface LintResult {
  score: number;
  issues: string[];
  warnings: string[];
}

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function lintApi(api: LintInput): LintResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (!api.description || api.description.trim().length === 0) {
    issues.push("Missing description"); score -= 15;
  }
  if (!KEBAB_RE.test(api.slug)) {
    issues.push("slug must be kebab-case (lowercase letters, numbers, hyphens)"); score -= 10;
  }
  if (!api.supportContact) {
    issues.push("Missing support contact"); score -= 10;
  }
  if (!api.specKey && !api.specUrl) {
    issues.push("No spec uploaded or linked"); score -= 20;
  }
  if (api.type === "REST" && !api.visibility) {
    warnings.push("Visibility not set — defaults to INTERNAL");
  }
  if (api.piiIndicator && !api.dataClassification) {
    warnings.push("API contains PII but no data classification set"); score -= 5;
  }
  if (api.visibility === "PUBLIC" && api.dataClassification === "RESTRICTED") {
    issues.push("PUBLIC visibility conflicts with RESTRICTED data classification"); score -= 15;
  }

  return { score: Math.max(0, score), issues, warnings };
}
