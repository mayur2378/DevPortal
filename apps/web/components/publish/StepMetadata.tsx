"use client";
interface Org { id: string; name: string; slug: string }
interface Props {
  orgs: Org[];
  value: { orgId: string; name: string; slug: string; type: string; description: string; category: string };
  onChange: (v: Props["value"]) => void;
  onNext: () => void;
}
export function StepMetadata({ orgs, value, onChange, onNext }: Props) {
  const set = (k: keyof Props["value"]) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange({ ...value, [k]: e.target.value });
  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1";
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Step 1 — API Details</h2>
      <div>
        <label className={labelCls}>Organization</label>
        <select value={value.orgId} onChange={set("orgId")} className={inputCls}>
          <option value="">Select an organization…</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>API name</label>
        <input type="text" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value, slug: autoSlug(e.target.value) })} placeholder="Payments API" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Slug <span className="text-slate-600">(auto-generated, editable)</span></label>
        <input type="text" value={value.slug} onChange={set("slug")} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Type</label>
        <select value={value.type} onChange={set("type")} className={inputCls}>
          <option value="REST">REST (OpenAPI)</option>
          <option value="GRAPHQL">GraphQL</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Description <span className="text-slate-600">(optional)</span></label>
        <textarea value={value.description} onChange={set("description")} rows={3} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Category <span className="text-slate-600">(optional)</span></label>
        <input type="text" value={value.category} onChange={set("category")} placeholder="Payments, Identity…" className={inputCls} />
      </div>
      <button onClick={onNext} disabled={!value.orgId || !value.name || !value.slug} className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors">Continue →</button>
    </div>
  );
}
