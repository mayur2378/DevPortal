export interface CurlExample {
  operationId: string;
  method: string;
  path: string;
  summary: string;
  curl: string;
}

export function generateCurlExamples(spec: any, baseUrl: string): CurlExample[] {
  const paths = spec.paths ?? {};
  const examples: CurlExample[] = [];

  for (const [path, methods] of Object.entries(paths) as [string, any][]) {
    for (const [method, op] of Object.entries(methods) as [string, any][]) {
      if (!["get","post","put","patch","delete"].includes(method)) continue;
      const queryParams = (op.parameters ?? []).filter((p: any) => p.in === "query");
      const queryString = queryParams.map((p: any) => `${p.name}=${p.example ?? `{${p.name}}`}`).join("&");
      const url = queryString ? `"${baseUrl}${path}?${queryString}"` : `"${baseUrl}${path}"`;
      const hasBody = !!op.requestBody;
      const bodyExample = op.requestBody?.content?.["application/json"]?.example;
      const bodyStr = bodyExample ? JSON.stringify(bodyExample) : "{}";

      const lines = ["curl -s \\", `  -X ${method.toUpperCase()} ${url} \\`, `  -H "Content-Type: application/json" \\`, `  -H "Authorization: Bearer {token}"`];
      if (hasBody) lines.push(` \\\n  --data '${bodyStr}'`);

      examples.push({
        operationId: op.operationId ?? `${method}-${path.replace(/\//g, "-")}`,
        method: method.toUpperCase(),
        path,
        summary: op.summary ?? "",
        curl: lines.join(" \\\n"),
      });
    }
  }
  return examples;
}
