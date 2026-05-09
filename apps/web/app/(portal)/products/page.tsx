import { createCaller } from "@/lib/trpc/server";
import { ProductCard } from "@/components/products/ProductCard";

export default async function ProductCatalogPage() {
  const caller = await createCaller();
  const products = await caller.product.list();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">API Products</h1>
          <p className="text-slate-400 text-sm mt-0.5">Curated bundles of related APIs</p>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>No API products yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              name={p.name}
              slug={p.slug}
              description={p.description}
              ownerName={p.owner.name ?? "Unknown"}
              apiCount={p.apis.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
