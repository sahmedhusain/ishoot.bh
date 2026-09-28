const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: DATABASE_URL environment variable is missing in production. Please configure it in your environment.",
    );
  }
}

import { PrismaClient } from "../prisma/generated/client";

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = db;
