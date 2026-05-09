interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

function generateFromSchema(schema: any): unknown {
  if (!schema) return null;
  switch (schema.type) {
    case "object": {
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        obj[key] = generateFromSchema(prop as any);
      }
      return obj;
    }
    case "array":
      return [generateFromSchema(schema.items)];
    case "string":
      if (schema.enum) return schema.enum[0];
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      return schema.example ?? "string";
    case "integer":
    case "number":
      return schema.example ?? 1;
    case "boolean":
      return schema.example ?? true;
    default:
      return null;
  }
}

function findOperation(spec: any, operationId: string): { method: string; path: string; operation: any } | null {
  const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods as any)) {
      if (!HTTP_METHODS.includes(method)) continue;
      const native = (op as any).operationId;
      const fallback = `${method}${path}`;
      if (native === operationId || fallback === operationId) {
        return { method, path, operation: op };
      }
    }
  }
  return null;
}

export async function generateOpenApiResponse(
  spec: any,
  operationId: string,
  preferredStatus = "200"
): Promise<MockResponse> {
  const found = findOperation(spec, operationId);
  if (!found) throw new Error(`Operation not found: ${operationId}`);

  const { operation } = found;
  const responses = operation.responses ?? {};
  const statusKey = responses[preferredStatus] ? preferredStatus : Object.keys(responses)[0];
  const response = responses[statusKey];
  const statusCode = parseInt(statusKey, 10);

  const content = response?.content?.["application/json"];
  if (!content) return { statusCode, headers: { "Content-Type": "application/json" }, body: null };

  const body =
    content.example ??
    content.examples?.[Object.keys(content.examples)[0]]?.value ??
    generateFromSchema(content.schema);

  return { statusCode, headers: { "Content-Type": "application/json" }, body };
}
