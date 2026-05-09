import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, readSpec } from "@devportal/db";
import { generateGraphQLResponse } from "@/lib/mock/graphql";

export async function POST(req: NextRequest, { params }: { params: { versionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ errors: [{ message: "Unauthorized" }] }, { status: 401 });

  const version = await prisma.apiVersion.findUnique({
    where: { id: params.versionId },
    select: { specKey: true, status: true },
  });
  if (!version || version.status !== "PUBLISHED" || !version.specKey) {
    return NextResponse.json({ errors: [{ message: "Not found" }] }, { status: 404 });
  }

  const { query } = await req.json();
  const buffer = await readSpec(version.specKey);
  const sdl = buffer.toString("utf8");
  const data = await generateGraphQLResponse(sdl, query);
  return NextResponse.json(data);
}
