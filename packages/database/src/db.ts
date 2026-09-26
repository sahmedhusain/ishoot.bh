const DEFAULT_DB_URL = "postgresql://ishoot:ishoot_password@localhost:5432/ishoot_db?schema=public";
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DB_URL;

import { PrismaClient } from '../prisma/generated/client';

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

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = db;
