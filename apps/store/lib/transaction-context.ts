import { AsyncLocalStorage } from "node:async_hooks";

export type TransactionClient = any;
export const transactionContext =
  new AsyncLocalStorage<TransactionClient>();
