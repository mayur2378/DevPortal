interface Props { versionId: string; apiName: string }

export function PostmanExporter({ versionId, apiName }: Props) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <div>
        <p className="text-white font-semibold text-sm">Postman Collection</p>
        <p className="text-slate-400 text-xs mt-0.5">Download a ready-to-import Postman collection for {apiName}</p>
      </div>
      <a
        href={`/api/export-postman/${versionId}`}
        download
        className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
      >
        Download Collection
      </a>
    </div>
  );
}
