import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
export const operationContext = new AsyncLocalStorage<{
  id: string;
  dbQueries: number;
  dbMs: number;
  rows: number;
  record: boolean;
  memo: Map<string, Promise<unknown>>;
}>();
export async function measureOperation<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (operationContext.getStore()) return operation();
  const context = {
      id: randomUUID(),
      dbQueries: 0,
      dbMs: 0,
      rows: 0,
      record: process.env.OBSERVABILITY_ENABLED === "true",
      memo: new Map<string, Promise<unknown>>(),
    },
    start = performance.now();
  let failed = false,
    bytes: number | undefined;
  try {
    return await operationContext.run(context, async () => {
      const result = await operation();
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success === false
      )
        failed = true;
      if (context.record && !(result instanceof Response)) {
        try {
          bytes = Buffer.byteLength(JSON.stringify(result));
        } catch {}
      } else if (context.record && result instanceof Response) {
        try {
          result.headers.set("X-Request-ID", context.id);
        } catch {}
      }
      return result;
    });
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (context.record)
      console.info(
        JSON.stringify({
          event: "operation",
          operation: name,
          requestId: context.id,
          durationMs: Math.round((performance.now() - start) * 100) / 100,
          dbQueries: context.dbQueries,
          dbMs: Math.round(context.dbMs * 100) / 100,
          rows: context.rows,
          responseBytes: bytes,
          failed,
        }),
      );
  }
}

export async function memoizeOperation<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const context = operationContext.getStore();
  if (!context) return operation();
  let result = context.memo.get(key);
  if (!result) {
    result = Promise.resolve().then(operation);
    context.memo.set(key, result);
  }
  return result as Promise<T>;
}
