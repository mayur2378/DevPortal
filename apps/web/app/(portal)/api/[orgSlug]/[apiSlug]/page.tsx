import { createCaller } from "@/lib/trpc/server";
import { redirect, notFound } from "next/navigation";

export default async function ApiRootPage({ params }: { params: { orgSlug: string; apiSlug: string } }) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug(params).catch(() => null);
  if (!api || !api.versions.length) notFound();
  redirect(`/api/${params.orgSlug}/${params.apiSlug}/${api.versions[0].version}/docs`);
}
