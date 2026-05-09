import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@devportal/db";

const MOCK_ENGINE_URL = process.env.MOCK_ENGINE_URL ?? "http://localhost:3001";

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

  const response = await fetch(`${MOCK_ENGINE_URL}/mock/rest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ specKey: version.specKey, operationId, preferredStatus }),
  });

  const text = await response.text();
  if (!text) return new Response(null, { status: response.status });
  return NextResponse.json(JSON.parse(text), { status: response.status });
}
