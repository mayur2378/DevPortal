export interface OperationInfo {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
}

function resolveRef(ref: string, spec: any): any {
  const parts = ref.replace(/^#\//, "").split("/");
  let current = spec;
  for (const part of parts) {
    current = current?.[decodeURIComponent(part.replace(/~1/g, "/").replace(/~0/g, "~"))];
  }
  return current;
}

function inlineRefs(node: any, spec: any, depth = 0): any {
  if (!node || typeof node !== "object" || depth > 10) return node;
  if (Array.isArray(node)) return node.map((item) => inlineRefs(item, spec, depth + 1));
  if (node.$ref) return inlineRefs(resolveRef(node.$ref, spec), spec, depth + 1);
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(node)) {
    result[k] = inlineRefs(v, spec, depth + 1);
  }
  return result;
}

export function extractOperations(spec: any): OperationInfo[] {
  const ops: OperationInfo[] = [];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods as any)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        const operation = op as any;
        ops.push({
          operationId: operation.operationId ?? `${method}${path}`,
          method: method.toUpperCase(),
          path,
          summary: operation.summary,
          parameters: operation.parameters,
          requestBody: inlineRefs(operation.requestBody, spec),
          responses: inlineRefs(operation.responses ?? {}, spec),
        });
      }
    }
  }
  return ops;
}
