import { createCaller } from "@/lib/trpc/server";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ProductApiList } from "@/components/products/ProductApiList";
import { ProductRoadmap } from "@/components/products/ProductRoadmap";
import { ProductSubscriptionForm } from "@/components/products/ProductSubscriptionForm";
import ReactMarkdown from "react-markdown";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [caller, session] = await Promise.all([createCaller(), auth()]);
  const product = await caller.product.getBySlug({ slug: params.slug }).catch(() => null);
  if (!product) return notFound();

  const alreadyRequested = session?.user
    ? product.subscriptionRequests.some((r) => r.requesterId === session.user.id && r.status === "PENDING")
    : false;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{product.name}</h1>
          {product.description && <p className="text-slate-400 text-sm mt-1 max-w-2xl">{product.description}</p>}
          <p className="text-slate-500 text-xs mt-2">Product Owner: {product.owner.name} · {product.owner.email}</p>
        </div>
      </div>

      {session?.user && (
        <ProductSubscriptionForm productId={product.id} productName={product.name} alreadyRequested={alreadyRequested} />
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Included APIs ({product.apis.length})</h2>
        <ProductApiList apis={product.apis as any} />
      </div>

      {product.documentation && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Documentation</h2>
          <div className="prose prose-invert prose-sm max-w-none p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <ReactMarkdown>{product.documentation}</ReactMarkdown>
          </div>
        </div>
      )}

      {product.roadmap && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Product Roadmap</h2>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <ProductRoadmap roadmap={product.roadmap} />
          </div>
        </div>
      )}
    </div>
  );
}
