import { StatusBadge } from "@/components/ui/StatusBadge";
import { VisibilityChip } from "@/components/ui/VisibilityChip";
import Link from "next/link";

interface ProductApi {
  api: {
    id: string; name: string; type: string; visibility: string;
    org: { slug: string }; slug: string;
    versions: { version: string; lifecycleStatus: string }[];
  };
}
interface Props { apis: ProductApi[] }

export function ProductApiList({ apis }: Props) {
  if (apis.length === 0) return <p className="text-slate-500 text-sm">No APIs in this product yet.</p>;
  return (
    <div className="space-y-2">
      {apis.map(({ api }) => (
        <Link key={api.id} href={`/api/${api.org.slug}/${api.slug}/latest/reference`}
          className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-colors">
          <div>
            <p className="text-white font-medium text-sm">{api.name}</p>
            <p className="text-slate-500 text-xs">{api.type}</p>
          </div>
          <div className="flex items-center gap-2">
            <VisibilityChip visibility={api.visibility} />
            {api.versions[0] && <StatusBadge status={api.versions[0].lifecycleStatus} />}
          </div>
        </Link>
      ))}
    </div>
  );
}
