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
  export type TaskWhereInput = any;
  export type SalesOrderWhereInput = any;
  export type EmployeeSupportInclude = any;
  export type EmployeeSupportGetPayload<T = any> = any;
  export type InquiryInclude = any;
  export type InquiryGetPayload<T = any> = any;
  export type InquiryWhereInput = any;
  export type InquiryOrderByWithRelationInput = any;
  export type InquirySelect = any;
  export type LegalMatterWhereInput = any;
  export type CrmDealSelect = any;
  export type InvoiceSelect = any;
  export type PaymentSelect = any;
  export type ExpenseSelect = any;
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
