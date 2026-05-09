interface Props { apiName: string; retirementDate?: Date | null; replacementHint?: string | null }

export function DeprecationBanner({ apiName, retirementDate, replacementHint }: Props) {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl mb-6">
      <span className="text-amber-400 text-lg shrink-0">⚠</span>
      <div>
        <p className="text-amber-300 font-semibold text-sm">
          {apiName} is deprecated
          {retirementDate && ` — scheduled for retirement on ${new Date(retirementDate).toLocaleDateString()}`}
        </p>
        {replacementHint && <p className="text-amber-400/80 text-xs mt-0.5">{replacementHint}</p>}
        <p className="text-amber-500 text-xs mt-1">Please migrate to the recommended alternative. Contact the API owner for migration guidance.</p>
      </div>
    </div>
  );
}
