import {
  getCompanyConfiguration,
  getCompanyConfigurationForIT,
  getCompanySetupStatus,
  getCompanySetupStatusForIT,
} from "./api/company";
import { asUser, currentUser } from "./session";

export interface CompanyBranding {
  isSetup: boolean;
  name: string;
  iconUrl: string | null;
}

export async function getCompanyBranding(accessToken?: string): Promise<CompanyBranding> {
  try {
    let token = accessToken;
    if (!token) {
      const user = await currentUser().catch(() => null);
      if (user?.token) token = user.token;
    }

    let company: {
      companyNameEn?: string | null;
      iconUrl?: string | null;
      logoUrl?: string | null;
    } | null = null;

    let status: {
      finished?: boolean;
      complete?: boolean;
    } | null = null;

    if (token) {
      [company, status] = await Promise.all([
        getCompanyConfigurationForIT(token!).catch(() => null),
        getCompanySetupStatusForIT(token!).catch(() => null),
      ]);
    } else {
      [company, status] = await Promise.all([
        getCompanyConfiguration().catch(() => null),
        getCompanySetupStatus().catch(() => null),
      ]);
    }

    const isSetup = Boolean(status?.finished || status?.complete);
    const companyName = company?.companyNameEn?.trim() || "";

    if (isSetup && companyName) {
      return {
        isSetup: true,
        name: `${companyName} Console`,
        iconUrl: company?.iconUrl || company?.logoUrl || null,
      };
    }
  } catch {
  }

  return {
    isSetup: false,
    name: "Console",
    iconUrl: null,
  };
}
