import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, readSpec } from "@devportal/db";
import Anthropic from "@anthropic-ai/sdk";
import yaml from "js-yaml";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { versionId } = await req.json();
  if (!versionId) return NextResponse.json({ error: "versionId required" }, { status: 400 });

  const version = await prisma.apiVersion.findUnique({
    where: { id: versionId },
    select: { specKey: true, specType: true },
  });
  if (!version || !version.specKey) return NextResponse.json({ error: "Version not found or has no spec" }, { status: 404 });

  const buffer = await readSpec(version.specKey);
  const text = buffer.toString("utf8");
  const spec = (text.trim().startsWith("{") ? JSON.parse(text) : yaml.load(text)) as any;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are a technical writer. Based on the following OpenAPI spec, generate developer documentation as a JSON array of doc pages. Be concise — aim for 150-250 words per page.

Each page object must have: slug (lowercase, hyphens), title, content (markdown), order (int from 0).

Generate exactly 4 pages:
1. slug "overview" — purpose, base URL, key features (2-3 sentences each)
2. slug "authentication" — auth type, how to get a token, one curl example showing the Authorization header
3. slug "endpoints" — markdown table of all endpoints (Method | Path | Description), then one short section per endpoint showing the request body or params and a sample response
4. slug "errors" — table of HTTP status codes and meanings for this API

Output ONLY a raw JSON array. No markdown fences, no explanation.

Spec:
${JSON.stringify(spec, null, 2)}`,
      },
    ],
  });

  const raw = (message.content[0] as any).text.trim();
  let pages: { slug: string; title: string; content: string; order: number }[];
  try {
    pages = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Model returned invalid JSON. Try again." }, { status: 500 });
  }

  await Promise.all(
    pages.map((page) =>
      prisma.docPage.upsert({
        where: { apiVersionId_slug: { apiVersionId: versionId, slug: page.slug } },
        create: { apiVersionId: versionId, ...page },
        update: { title: page.title, content: page.content, order: page.order },
      })
    )
  );

  return NextResponse.json({ pages: pages.map((p) => ({ slug: p.slug, title: p.title })) });
}
