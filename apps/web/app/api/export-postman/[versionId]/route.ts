import { NextRequest, NextResponse } from "next/server";
import { createCaller } from "@/lib/trpc/server";
import { generatePostmanCollection } from "@/lib/postman-generator";

export async function GET(req: NextRequest, { params }: { params: { versionId: string } }) {
  const caller = await createCaller();
  const version = await caller.apiVersion.getById({ id: params.versionId });

  let spec: any = null;
  if (version.specKey) {
    const specRes = await fetch(`${req.nextUrl.origin}/api/spec/${params.versionId}`);
    if (specRes.ok) spec = await specRes.json();
  } else if (version.specUrl) {
    const specRes = await fetch(version.specUrl);
    if (specRes.ok) spec = await specRes.json();
  }

  if (!spec) {
    return NextResponse.json({ error: "Spec not found" }, { status: 404 });
  }

  const baseUrl = process.env.MOCK_ENGINE_URL ?? "http://localhost:3001";
  const collection = generatePostmanCollection(spec, baseUrl);

  return new NextResponse(JSON.stringify(collection, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="postman-collection-v${version.version}.json"`,
    },
  });
}
