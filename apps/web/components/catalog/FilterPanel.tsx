"use client";

export interface CatalogFilters {
  visibility?: string;
  domainId?: string;
  tags?: string[];
  type?: string;
  lifecycleStatus?: string;
}

interface Props {
  domains: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
}

const TYPES = ["REST", "GRAPHQL", "ASYNC_API", "EVENT", "WEBHOOK", "SOAP"];
const VISIBILITIES = ["PUBLIC", "PARTNER", "INTERNAL"];
const LIFECYCLE = ["ACTIVE", "BETA", "DRAFT", "DEPRECATED", "RETIRED"];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${active ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
      {label}
    </button>
  );
}

export function FilterPanel({ domains, tags, filters, onChange }: Props) {
  const toggle = (key: keyof CatalogFilters, value: string) => {
    if (key === "tags") {
      const current = filters.tags ?? [];
      const next = current.includes(value) ? current.filter((t) => t !== value) : [...current, value];
      onChange({ ...filters, tags: next });
    } else {
      onChange({ ...filters, [key]: filters[key] === value ? undefined : value });
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Visibility</p>
        <div className="flex flex-wrap gap-2">
          {VISIBILITIES.map((v) => <Chip key={v} label={v} active={filters.visibility === v} onClick={() => toggle("visibility", v)} />)}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">API Type</p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => <Chip key={t} label={t} active={filters.type === t} onClick={() => toggle("type", t)} />)}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lifecycle</p>
        <div className="flex flex-wrap gap-2">
          {LIFECYCLE.map((l) => <Chip key={l} label={l} active={filters.lifecycleStatus === l} onClick={() => toggle("lifecycleStatus", l)} />)}
        </div>
      </div>
      {domains.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Domain</p>
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => <Chip key={d.id} label={d.name} active={filters.domainId === d.id} onClick={() => toggle("domainId", d.id)} />)}
          </div>
        </div>
      )}
      {tags.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => <Chip key={t.id} label={t.name} active={(filters.tags ?? []).includes(t.name)} onClick={() => toggle("tags", t.name)} />)}
          </div>
        </div>
      )}
    </div>
  );
}
