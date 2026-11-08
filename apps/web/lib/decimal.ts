export class Decimal {
  private val: number;

  constructor(v: number | string | Decimal | unknown) {
    if (v instanceof Decimal) {
      this.val = v.val;
    } else {
      this.val = Number(v) || 0;
    }
  }

  add(other: number | string | Decimal | unknown): Decimal {
    const o = other instanceof Decimal ? other.val : Number(other) || 0;
    return new Decimal(this.val + o);
  }

  sub(other: number | string | Decimal | unknown): Decimal {
    const o = other instanceof Decimal ? other.val : Number(other) || 0;
    return new Decimal(this.val - o);
  }

  mul(other: number | string | Decimal | unknown): Decimal {
    const o = other instanceof Decimal ? other.val : Number(other) || 0;
    return new Decimal(this.val * o);
  }

  div(other: number | string | Decimal | unknown): Decimal {
    const o = other instanceof Decimal ? other.val : Number(other) || 1;
    return new Decimal(this.val / o);
  }

  toNumber(): number {
    return this.val;
  }

  toString(): string {
    return String(this.val);
  }

  toFixed(fractionDigits?: number): string {
    return this.val.toFixed(fractionDigits);
  }
}

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
  export type AnnouncementGetPayload<T = any> = any;
  export type AssetInclude = any;
  export type AssetGetPayload<T = any> = any;
  export type AssetWhereInput = any;
  export type AssetOrderByWithRelationInput = any;
  export type ApprovalRequestWhereInput = any;
  export type ApprovalPolicyInclude = any;
  export type ApprovalPolicyGetPayload<T = any> = any;
}

export const sql = (strings: TemplateStringsArray | string[], ...values: any[]) => ({
  strings,
  values,
  text: Array.isArray(strings) ? strings.join("?") : "",
  sql: Array.isArray(strings) ? strings.join("?") : "",
});

export const Prisma: any = {
  Decimal,
  SortOrder: {
    asc: "asc",
    desc: "desc",
  },
  sql,
  empty: sql``,
  join: (values: any[], _separator = ",") => values,
  raw: (str: string) => str,
};

export type PrismaClient = any;
