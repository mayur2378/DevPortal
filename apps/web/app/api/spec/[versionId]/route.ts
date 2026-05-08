import { NextRequest, NextResponse } from "next/server";
import { prisma, readSpec } from "@devportal/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { versionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const version = await prisma.apiVersion.findUnique({
    where: { id: params.versionId },
    select: { specKey: true, specType: true, status: true },
  });
  if (!version || version.status !== "PUBLISHED") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await readSpec(version.specKey);
  const contentType = version.specType === "REST"
    ? (version.specKey.endsWith(".json") ? "application/json" : "application/yaml")
    : "text/plain";

  return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
}
