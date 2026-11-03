export namespace Prisma {
  export type Decimal = number | string | any;
  export type SortOrder = "asc" | "desc";
  export type TransactionClient = any;
  export type InputJsonObject = any;
  export type JsonObject = any;
  export type JsonValue = any;
  export type InputJsonValue = any;
  export type Middleware = any;
  export type Sql = any;
}

export type PrismaClient = any;

export const Prisma: any = {
  Decimal: class Decimal {
    private val: any;
    constructor(v: any) {
      this.val = v;
    }
    toNumber() {
      return Number(this.val);
    }
    toString() {
      return String(this.val);
    }
  },
  SortOrder: {
    asc: "asc",
    desc: "desc",
  },
  sql: (...args: any[]) => args,
  empty: "",
  join: (...args: any[]) => args,
  raw: (...args: any[]) => args,
};
