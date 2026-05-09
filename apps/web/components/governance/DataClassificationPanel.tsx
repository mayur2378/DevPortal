import { DataClassBadge } from "@/components/ui/DataClassBadge";

interface Props {
  dataClassification: string;
  piiIndicator: boolean;
  phiIndicator: boolean;
  visibility: string;
}

export function DataClassificationPanel({ dataClassification, piiIndicator, phiIndicator, visibility }: Props) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
      <p className="text-white font-semibold text-sm">Data & Security Classification</p>
      <div className="flex flex-wrap gap-3">
        <DataClassBadge classification={dataClassification} />
        {piiIndicator && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-900/40 text-orange-300">
            ⚠ Contains PII
          </span>
        )}
        {phiIndicator && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-900/40 text-red-300">
            ⚠ Contains PHI (HIPAA)
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Visibility: <span className="text-slate-300">{visibility}</span> ·
        These classifications are for documentation and access control guidance.
      </p>
    </div>
  );
}
