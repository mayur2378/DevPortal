interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

function resolveRef(ref: string, spec: any): any {
  const parts = ref.replace(/^#\//, "").split("/");
  let current = spec;
  for (const part of parts) {
    current = current?.[decodeURIComponent(part.replace(/~1/g, "/").replace(/~0/g, "~"))];
  }
  return current;
}

function generateFromSchema(schema: any, spec: any, depth = 0): unknown {
  if (!schema || depth > 8) return null;

  if (schema.$ref) {
    return generateFromSchema(resolveRef(schema.$ref, spec), spec, depth + 1);
  }

  if (schema.example !== undefined) return schema.example;

  if (schema.allOf) {
    const obj: Record<string, unknown> = {};
    for (const sub of schema.allOf) {
      const resolved = generateFromSchema(sub, spec, depth + 1);
      if (resolved !== null && typeof resolved === "object" && !Array.isArray(resolved)) {
        Object.assign(obj, resolved);
      }
    }
    return Object.keys(obj).length ? obj : null;
  }

  if (schema.anyOf || schema.oneOf) {
    const variants: any[] = schema.anyOf ?? schema.oneOf;
    return generateFromSchema(variants[0], spec, depth + 1);
  }

  switch (schema.type) {
    case "object": {
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        obj[key] = generateFromSchema(prop as any, spec, depth + 1);
      }
      return obj;
    }
    case "array":
      return [generateFromSchema(schema.items, spec, depth + 1)];
    case "string":
      if (schema.enum) return schema.enum[0];
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      if (schema.format === "email") return "user@example.com";
      if (schema.format === "uri") return "https://example.com";
      if (schema.format === "date") return new Date().toISOString().split("T")[0];
      return schema.example ?? schema.default ?? "string";
    case "integer":
    case "number":
      return schema.example ?? schema.default ?? 1;
    case "boolean":
      return schema.example ?? schema.default ?? true;
    default:
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateFromSchema(prop as any, spec, depth + 1);
        }
        return obj;
      }
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
    generateFromSchema(content.schema, spec);

  return { statusCode, headers: { "Content-Type": "application/json" }, body };
}
