// Zero-Prisma stub for the decommissioned monolithic database.
const createModelStub = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "then") return undefined;
        if (typeof prop === "string") {
          if (prop === "findMany" || prop === "groupBy") return async () => [];
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

const defaultServiceSettings = {
  id: "default",
  slaUrgentHours: 4,
  slaHighHours: 24,
  slaNormalHours: 72,
  updatedAt: new Date(),
};

const defaultUsers = [
  {
    id: "super-admin",
    fullName: "Super Admin",
    email: "admin@ishoot.bh",
    role: "super_admin",
    managerId: null,
    permissions: {},
    departmentId: null,
    isActive: true,
  },
  {
    id: "usr_super_admin",
    fullName: "Super Admin",
    email: "admin@ishoot.bh",
    role: "super_admin",
    managerId: null,
    permissions: {},
    departmentId: null,
    isActive: true,
  },
];

const createDbStub = () => {
  let proxy: any;
  const base = {
    $transaction: async <T>(op: (tx: any) => Promise<T>): Promise<T> => {
      if (typeof op === "function") return op(proxy);
      return Promise.all(op as any) as any;
    },
    $queryRaw: async (...args: any[]) => {
      const q = typeof args[0] === "string" ? args[0] : JSON.stringify(args[0]);
      if (q && q.includes("defaultCurrency")) return [{ defaultCurrency: "BHD" }];
      if (q && (q.includes("monthKey") || q.includes("generate_series"))) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        return [{ monthKey: `${year}-${month}`, revenue: 0, expenses: 0 }];
      }
      if (
        q &&
        (q.includes("outstanding") ||
          q.includes("revenue") ||
          q.includes("discountsGiven") ||
          q.includes("vatCollected"))
      ) {
        return [
          {
            revenue: 0,
            expenses: 0,
            outstanding: 0,
            overdue: 0,
            discountsGiven: 0,
            vatCollected: 0,
          },
        ];
      }
      return [];
    },
    $executeRaw: async (...args: any[]) => 0,
    $connect: async () => {},
    $disconnect: async () => {},
  };

  proxy = new Proxy(base, {
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
      if (prop === "serviceSettings") {
        return new Proxy(
          {},
          {
            get: (_t, modelProp) => {
              if (modelProp === "then") return undefined;
              return async () => defaultServiceSettings;
            },
          },
        );
      }
      if (prop === "user") {
        return new Proxy(
          {},
          {
            get: (_t, modelProp) => {
              if (modelProp === "then") return undefined;
              if (modelProp === "findMany") return async () => defaultUsers;
              if (modelProp === "findUnique" || modelProp === "findFirst") {
                return async (args?: any) => {
                  const id = args?.where?.id;
                  const email = args?.where?.email;
                  return (
                    defaultUsers.find(
                      (u) => (id && u.id === id) || (email && u.email === email),
                    ) ?? defaultUsers[0]
                  );
                };
              }
              if (modelProp === "count") return async () => defaultUsers.length;
              return async () => null;
            },
          },
        );
      }
      return createModelStub();
    },
  });
  return proxy;
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