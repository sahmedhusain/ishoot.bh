// Zero-Prisma stub for the decommissioned monolithic database.
const createModelStub = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "then") return undefined;
        return async () => null;
      },
    },
  );

const createDbStub = () => {
  const base = {
    $transaction: async <T>(op: (tx: any) => Promise<T>): Promise<T> => {
      if (typeof op === "function") return op(base as any);
      return Promise.all(op as any) as any;
    },
    $queryRaw: async (...args: any[]) => [],
    $executeRaw: async (...args: any[]) => 0,
    $connect: async () => {},
    $disconnect: async () => {},
  };

  return new Proxy(base, {
    get: (target: any, prop: string | symbol) => {
      if (prop in target) return target[prop];
      if (typeof prop === "symbol") return undefined;
      return createModelStub();
    },
  });
};

export const db: any = createDbStub();

export async function runAtomicMutation<T>(operation: () => Promise<T>): Promise<T> {
  return operation();
}

export function outsideTransaction<T>(operation: () => T): T {
  return operation();
}