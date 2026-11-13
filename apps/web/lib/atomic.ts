export async function runAtomicMutation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return operation();
}

export function outsideTransaction<T>(operation: () => T): T {
  return operation();
}

export type DbClient = {
  $queryRaw: <T = any>(...args: any[]) => Promise<T>;
  $executeRaw: <T = any>(...args: any[]) => Promise<T>;
  [key: string]: any;
};

function createModelProxy(): any {
  const model: any = () => Promise.resolve(null);
  return new Proxy(model, {
    get: (_target, prop) => {
      if (prop === "then") return undefined;
      if (prop === "findMany" || prop === "groupBy") return async () => [];
      if (prop === "findUnique" || prop === "findFirst" || prop === "findUniqueOrThrow" || prop === "findFirstOrThrow")
        return async () => null;
      if (prop === "count") return async () => 0;
      if (prop === "aggregate")
        return async () => ({
          _count: { _all: 0 },
          _sum: {},
          _avg: {},
          _min: {},
          _max: {},
        });
      if (
        prop === "updateMany" ||
        prop === "deleteMany" ||
        prop === "createMany"
      )
        return async () => ({ count: 0 });
      if (prop === "upsert")
        return async (args: any) => ({
          id: args?.where?.id || "mock-id",
          lastNumber: 1,
          ...(args?.create || args?.update || args?.data || {}),
        });
      if (prop === "create" || prop === "update" || prop === "delete")
        return async (args: any) => ({ id: "mock-id", lastNumber: 1, ...(args?.data || {}) });
      return createModelProxy();
    },
    apply: () => Promise.resolve(null),
  });
}

export const db: DbClient = new Proxy(
  {} as DbClient,
  {
    get: (_target, prop) => {
      if (prop === "then") return undefined;
      if (prop === "$queryRaw" || prop === "$executeRaw" || prop === "$queryRawUnsafe" || prop === "$executeRawUnsafe") {
        return async () => [];
      }
      if (prop === "$transaction") {
        return async (fnOrArray: any) => {
          if (typeof fnOrArray === "function") return fnOrArray(db);
          if (Array.isArray(fnOrArray)) return Promise.all(fnOrArray);
          return null;
        };
      }
      if (prop === "$connect" || prop === "$disconnect") {
        return async () => {};
      }
      return createModelProxy();
    },
  },
);
