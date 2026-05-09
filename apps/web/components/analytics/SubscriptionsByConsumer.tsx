interface App { name: string; owner: string; subscriptions: number }
interface Props { data: App[] }

export function SubscriptionsByConsumer({ data }: Props) {
  const max = Math.max(...data.map((d) => d.subscriptions), 1);
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <p className="text-white font-semibold mb-4">Subscriptions by Consumer Application</p>
      <div className="space-y-3">
        {data.slice(0, 10).map((app) => (
          <div key={app.name}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-sm text-white">{app.name}</span>
                <span className="text-xs text-slate-500 ml-2">{app.owner}</span>
              </div>
              <span className="text-sm font-semibold text-sky-400">{app.subscriptions}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(app.subscriptions / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
