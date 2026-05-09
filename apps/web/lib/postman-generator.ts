export interface PostmanCollection {
  info: { name: string; schema: string; description?: string };
  item: any[];
  variable: { key: string; value: string }[];
}

export function generatePostmanCollection(spec: any, baseUrl: string): PostmanCollection {
  const info = spec.info ?? {};
  const paths = spec.paths ?? {};
  const items: any[] = [];

  for (const [path, methods] of Object.entries(paths) as [string, any][]) {
    for (const [method, op] of Object.entries(methods) as [string, any][]) {
      if (!["get","post","put","patch","delete","head","options"].includes(method)) continue;
      const parameters = op.parameters ?? [];
      const queryParams = parameters.filter((p: any) => p.in === "query").map((p: any) => ({
        key: p.name, value: p.example ?? "", description: p.description ?? "", disabled: !p.required,
      }));
      const headers = parameters.filter((p: any) => p.in === "header").map((p: any) => ({
        key: p.name, value: p.example ?? "", description: p.description ?? "",
      }));
      headers.push({ key: "Content-Type", value: "application/json", description: "" });
      const body = op.requestBody?.content?.["application/json"]
        ? { mode: "raw", raw: JSON.stringify(op.requestBody.content["application/json"].example ?? { "_note": "Replace with actual payload" }, null, 2), options: { raw: { language: "json" } } }
        : undefined;

      items.push({
        name: op.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: headers,
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ["{{baseUrl}}"],
            path: path.split("/").filter(Boolean),
            query: queryParams,
          },
          ...(body && { body }),
          description: op.description ?? op.summary ?? "",
        },
      });
    }
  }

  return {
    info: {
      name: info.title ?? "API Collection",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      description: info.description,
    },
    item: items,
    variable: [{ key: "baseUrl", value: baseUrl }],
  };
}
