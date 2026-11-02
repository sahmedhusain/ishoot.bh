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

import { PrismaClient, Prisma } from "@prisma/client";
import { normalizeContactWrites } from "./services/contact-writes";
import {
  staffAccountSyncMiddleware,
  withAccountSync,
} from "./services/identity-sync";

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  const contactModels = new Map(
    Prisma.dmmf.datamodel.models.map((model) => [model.name, model.fields]),
  );
  client.$use(async (params, next) => {
    if (
      params.model &&
      ["create", "createMany", "update", "updateMany", "upsert"].includes(
        params.action,
      )
    ) {
      const suppliedCountry =
        params.model === "CompanySetting"
          ? (params.args.data?.country ??
            params.args.create?.country ??
            params.args.update?.country)
          : undefined;
      let country: string | undefined =
        typeof suppliedCountry === "string" ? suppliedCountry : undefined;
      const getCountry = async () =>
        (country ??=
          (
            await client.companySetting.findUnique({
              where: { singleton: 1 },
              select: { country: true },
            })
          )?.country ?? "");
      for (const data of params.action === "upsert"
        ? [params.args.create, params.args.update]
        : [params.args.data])
        await normalizeContactWrites(
          contactModels,
          params.model,
          data,
          getCountry,
        );
    }
    return next(params);
  });
  client.$use(staffAccountSyncMiddleware(client));
  client.$use(async (params, next) => {
    const context = operationContext.getStore();
    if (!context?.record) return next(params);
    const start = performance.now();
    try {
      const result = await next(params);
      context.rows += Array.isArray(result)
        ? result.length
        : result && typeof result === "object" && "count" in result
          ? result.count
          : result
            ? 1
            : 0;
      return result;
    } finally {
      context.dbQueries++;
      context.dbMs += performance.now() - start;
    }
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
    if (active && property === "$transaction")
      return async (operation: any) =>
        typeof operation === "function"
          ? operation(active)
          : Promise.all(operation);
    if (!active && property === "$transaction")
      return (operation: any, options?: any) =>
        withAccountSync(target, () =>
          typeof operation === "function"
            ? target.$transaction(
                (tx: Prisma.TransactionClient) =>
                  transactionContext.run(tx, () => operation(tx)),
                options,
              )
            : target.$transaction(operation, options),
        );
    const receiver = active || target;
    const value = (receiver as any)[property];
    return typeof value === "function" ? value.bind(receiver) : value;
  },
});
export async function runAtomicMutation<T>(
  operation: () => Promise<T>,
  isolationLevel?: Prisma.TransactionIsolationLevel,
): Promise<T> {
  if (transactionContext.getStore()) return operation();
  return withAccountSync(client, () =>
    client.$transaction((tx) => transactionContext.run(tx, operation), {
      timeout: 15000,
      isolationLevel,
    }),
  );
}

/** Runs work outside any open transaction, e.g. a write scheduled with after() once the transaction has ended. */
export function outsideTransaction<T>(operation: () => T): T {
  return transactionContext.exit(operation);
}

globalThis.prismaGlobal = client;
