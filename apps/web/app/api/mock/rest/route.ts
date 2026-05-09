import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, readSpec } from "@devportal/db";
import { generateOpenApiResponse } from "@/lib/mock/openapi";
import yaml from "js-yaml";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { versionId, operationId, preferredStatus } = await req.json();

  const version = await prisma.apiVersion.findUnique({
    where: { id: versionId },
    select: { specKey: true, status: true },
  });
  if (!version || version.status !== "PUBLISHED" || !version.specKey) {
    return NextResponse.json({ error: "Version not found or not published" }, { status: 404 });
  }

  const buffer = await readSpec(version.specKey);
  const text = buffer.toString("utf8");
  const spec = text.trim().startsWith("{") ? JSON.parse(text) : yaml.load(text);
  const mock = await generateOpenApiResponse(spec as any, operationId, preferredStatus ?? "200");

  if (mock.body === null || mock.body === undefined) {
    return new Response(null, { status: mock.statusCode });
  }
  return NextResponse.json(mock.body, { status: mock.statusCode });
}
