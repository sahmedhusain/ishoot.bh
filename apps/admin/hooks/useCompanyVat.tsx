"use client";

import * as React from "react";

export interface CompanyVat {
  /** The company is VAT-registered: every invoice and quotation carries VAT. When false, no VAT UI is shown anywhere. */
  enabled: boolean;
  /** Rate in percent (0 when disabled). */
  rate: number;
  /** Active taxes besides VAT and where they apply (company tax registry). */
  taxes: Array<{ code: string; name_en: string; name_ar: string; rate: number; invoices: boolean; quotations: boolean }>;
}

const CompanyVatContext = React.createContext<CompanyVat>({ enabled: false, rate: 0, taxes: [] });

export function CompanyVatProvider({ value, children }: { value: CompanyVat; children: React.ReactNode }) {
  return <CompanyVatContext.Provider value={value}>{children}</CompanyVatContext.Provider>;
}

export const useCompanyVat = () => React.useContext(CompanyVatContext);
