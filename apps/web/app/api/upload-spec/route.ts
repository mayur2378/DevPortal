import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveSpec } from "@devportal/db";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("spec") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 413 });

  const ext = file.name.endsWith(".yaml") || file.name.endsWith(".yml") ? "yaml"
    : file.name.endsWith(".json") ? "json"
    : file.name.endsWith(".graphql") || file.name.endsWith(".sdl") ? "graphql"
    : null;

  if (!ext) return NextResponse.json({ error: "Unsupported file type. Use .json, .yaml, or .graphql" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await saveSpec(`${randomUUID()}.${ext}`, buffer);

  return NextResponse.json({ key });
}
