"use client";
interface Props { spec: string }

export function AsyncAPIRenderer({ spec }: Props) {
  let parsed: any = null;
  try { parsed = JSON.parse(spec); } catch { return <p className="text-red-400 text-sm">Failed to parse AsyncAPI spec.</p>; }
  const info = parsed?.info ?? {};
  const channels = parsed?.channels ?? {};
  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <h2 className="text-lg font-bold text-white">{info.title ?? "AsyncAPI Spec"}</h2>
        <p className="text-slate-400 text-sm mt-1">{info.description}</p>
        <p className="text-xs text-slate-500 mt-1">Version: {info.version}</p>
      </div>
      {Object.entries(channels).map(([channel, def]: [string, any]) => (
        <div key={channel} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-violet-900/50 text-violet-300">CHANNEL</span>
            <code className="text-sm text-white font-mono">{channel}</code>
          </div>
          {def.description && <p className="text-slate-400 text-sm">{def.description}</p>}
          {def.subscribe && <div className="mt-2"><p className="text-xs font-semibold text-slate-400 uppercase">Subscribe</p>{def.subscribe.message?.description && <p className="text-slate-300 text-sm mt-1">{def.subscribe.message.description}</p>}</div>}
          {def.publish && <div className="mt-2"><p className="text-xs font-semibold text-slate-400 uppercase">Publish</p>{def.publish.message?.description && <p className="text-slate-300 text-sm mt-1">{def.publish.message.description}</p>}</div>}
        </div>
      ))}
    </div>
  );
}
