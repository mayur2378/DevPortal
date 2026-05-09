interface Props { authMethod?: string | null; rateLimitPolicy?: string | null; slaInfo?: string | null }

export function DocMetaFields({ authMethod, rateLimitPolicy, slaInfo }: Props) {
  if (!authMethod && !rateLimitPolicy && !slaInfo) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 mb-6">
      {authMethod && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Authentication</p><p className="text-sm text-white">{authMethod}</p><p className="text-xs text-slate-500 mt-0.5">Documentation only — enforced by gateway</p></div>}
      {rateLimitPolicy && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Rate Limit Policy</p><p className="text-sm text-white">{rateLimitPolicy}</p><p className="text-xs text-slate-500 mt-0.5">Documentation only — enforced by gateway</p></div>}
      {slaInfo && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">SLA / SLO</p><p className="text-sm text-white">{slaInfo}</p></div>}
    </div>
  );
}
