interface Subscription {
  id: string;
  environment: string;
  grantedAt: Date;
  application: { name: string; owner: { name: string; email: string } };
}
interface Props { subscriptions: Subscription[] }

export function ConsumerImpactTable({ subscriptions }: Props) {
  if (subscriptions.length === 0) {
    return <p className="text-slate-500 text-sm">No active consumers for this API.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/50">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/80">
          <tr>
            {["Application", "Owner", "Environment", "Granted"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {subscriptions.map((s) => (
            <tr key={s.id} className="hover:bg-slate-800/20">
              <td className="px-4 py-3 text-white">{s.application.name}</td>
              <td className="px-4 py-3 text-slate-400">{s.application.owner.name}</td>
              <td className="px-4 py-3 text-slate-400 uppercase text-xs">{s.environment}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{new Date(s.grantedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
