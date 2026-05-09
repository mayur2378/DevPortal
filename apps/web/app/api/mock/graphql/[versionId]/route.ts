import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@devportal/db";

const MOCK_ENGINE_URL = process.env.MOCK_ENGINE_URL ?? "http://localhost:3001";

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

  const body = await req.json();
  const response = await fetch(`${MOCK_ENGINE_URL}/mock/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ specKey: version.specKey, ...body }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
