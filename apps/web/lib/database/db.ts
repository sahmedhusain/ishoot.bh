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

const defaultCompanySetting = {
  id: "default",
  singleton: 1,
  companyNameEn: "iShoot",
  companyNameAr: "آي شوت",
  defaultCurrency: "BHD",
  currencyDecimals: 3,
  vatEnabled: false,
  vatPercentage: 10,
  theme: {},
  contentLanguages: ["en", "ar"],
  primaryLanguage: "en",
  country: "BH",
  timeZone: "Asia/Bahrain",
};

const createDbStub = () => {
  const base = {
    $transaction: async <T>(op: (tx: any) => Promise<T>): Promise<T> => {
      if (typeof op === "function") return op(base as any);
      return Promise.all(op as any) as any;
    },
    $queryRaw: async (...args: any[]) => {
      const q = typeof args[0] === "string" ? args[0] : JSON.stringify(args[0]);
      if (q && q.includes("defaultCurrency")) return [{ defaultCurrency: "BHD" }];
      return [];
    },
    $executeRaw: async (...args: any[]) => 0,
    $connect: async () => {},
    $disconnect: async () => {},
  };

  return new Proxy(base, {
    get: (target: any, prop: string | symbol) => {
      if (prop in target) return target[prop];
      if (typeof prop === "symbol") return undefined;
      if (prop === "companySetting") {
        return new Proxy(
          {},
          {
            get: (_t, modelProp) => {
              if (modelProp === "then") return undefined;
              return async () => defaultCompanySetting;
            },
          },
        );
      }
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

export async function runAtomicMutation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return operation();
}

export function outsideTransaction<T>(operation: () => T): T {
  return operation();
}
