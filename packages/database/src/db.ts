import { operationContext } from "./observability";
import { transactionContext } from "./transaction-context";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: DATABASE_URL environment variable is missing in production. Please configure it in your environment.",
    );
  }
}

import { PrismaClient, type Prisma } from "@prisma/client";

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  client.$use(async (params, next) => {
    const context = operationContext.getStore();
    if (!context?.record) return next(params);
    const start = performance.now();
    try {
      const result = await next(params);
      context.rows += Array.isArray(result) ? result.length : result && typeof result === "object" && "count" in result ? result.count : result ? 1 : 0;
      return result;
    } finally { context.dbQueries++; context.dbMs += performance.now() - start; }
  });
  return client;
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const client = globalThis.prismaGlobal ?? prismaClientSingleton();
// Existing query helpers participate in an explicit action transaction without a second connection.
export const db = new Proxy(client, {
  get(target, property) {
    const active = transactionContext.getStore();
    if (active && property === "$transaction") return async (operation: any) =>
      typeof operation === "function" ? operation(active) : Promise.all(operation);
    const receiver = active || target;
    const value = (receiver as any)[property];
    return typeof value === "function" ? value.bind(receiver) : value;
  },
});
export async function runAtomicMutation<T>(operation: () => Promise<T>, isolationLevel?: Prisma.TransactionIsolationLevel): Promise<T> {
  if (transactionContext.getStore()) return operation();
  return client.$transaction((tx) => transactionContext.run(tx, operation), { timeout: 15000, isolationLevel });
}

globalThis.prismaGlobal = client;
