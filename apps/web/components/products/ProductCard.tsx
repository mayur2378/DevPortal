import Link from "next/link";

interface Props {
  name: string;
  slug: string;
  description?: string | null;
  ownerName: string;
  apiCount: number;
}

export function ProductCard({ name, slug, description, ownerName, apiCount }: Props) {
  return (
    <Link href={`/products/${slug}`}
      className="block p-5 bg-slate-800/50 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 hover:border-sky-700/50 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-sky-600 flex items-center justify-center text-white font-bold text-lg">
          {name[0].toUpperCase()}
        </div>
        <span className="text-xs text-slate-500">{apiCount} API{apiCount !== 1 ? "s" : ""}</span>
      </div>
      <h3 className="text-white font-semibold group-hover:text-sky-300 transition-colors">{name}</h3>
      {description && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{description}</p>}
      <p className="text-slate-500 text-xs mt-3">Owner: {ownerName}</p>
    </Link>
  );
}
