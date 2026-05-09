interface Sub { id: string; api: { name: string }; application: { name: string; owner: { name: string; email: string } }; environment: string }
interface Props { subscriptions: Sub[] }

export function DeprecatedConsumersList({ subscriptions }: Props) {
  if (subscriptions.length === 0) return <p className="text-slate-500 text-sm">No consumers on deprecated APIs.</p>;
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-amber-700/30">
      <p className="text-amber-300 font-semibold mb-3">⚠ Consumers on Deprecated APIs ({subscriptions.length})</p>
      <div className="space-y-2">
        {subscriptions.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-700/30 last:border-0">
            <div>
              <span className="text-white">{s.application.name}</span>
              <span className="text-slate-500 text-xs ml-2">({s.application.owner.email})</span>
            </div>
            <div className="text-right">
              <p className="text-amber-400 text-xs">{s.api.name}</p>
              <p className="text-slate-500 text-xs">{s.environment.toUpperCase()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
