import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma } from "../prisma/generated/client";
export const transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();
