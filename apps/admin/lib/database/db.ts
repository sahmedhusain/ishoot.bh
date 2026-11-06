// Zero-Prisma stub for the decommissioned monolithic database.
const createModelStub = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "then") return undefined;
        if (typeof prop === "string") {
          if (prop === "findMany") return async () => [];
          if (prop === "count") return async () => 0;
          if (prop === "updateMany" || prop === "deleteMany" || prop === "createMany") return async () => ({ count: 0 });
        }
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

export interface DbStub {
  $transaction<T>(op: ((tx: any) => Promise<T>) | Promise<any>[] | any[], ...args: any[]): Promise<any>;
  $queryRaw<T = any>(...args: any[]): Promise<T>;
  $executeRaw(...args: any[]): Promise<number>;
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  [key: string]: any;
}

export const db: DbStub = createDbStub() as any;

export async function runAtomicMutation<T>(operation: () => Promise<T>): Promise<T> {
  return operation();
}

export function outsideTransaction<T>(operation: () => T): T {
  return operation();
}