import { ApiCard } from "./ApiCard";

type Api = Parameters<typeof ApiCard>[0]["api"];

interface Props {
  apis: Api[];
  searchQuery?: string;
}

export function ApiGrid({ apis, searchQuery }: Props) {
  if (apis.length === 0) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p className="text-lg font-medium text-slate-400 mb-1">No APIs found</p>
        <p className="text-sm">
          {searchQuery ? `No results for "${searchQuery}"` : "Be the first to publish one."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {apis.map((api) => (
        <ApiCard key={api.id} api={api} />
      ))}
    </div>
  );
}
