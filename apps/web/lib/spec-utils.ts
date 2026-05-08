export interface OperationInfo {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
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
          requestBody: operation.requestBody,
          responses: operation.responses ?? {},
        });
      }
    }
  }
  return ops;
}
