import type { PublicCompanySettings } from "@platform/database/types";

type Brand = Pick<
  PublicCompanySettings,
  "theme" | "logo_url" | "dark_logo_url" | "icon_url" | "dark_icon_url" | "full_logo_url" | "dark_full_logo_url"
>;

export const siteLogo = (company: Brand) => {
  const full =
    company.theme.websiteMode === "light"
      ? company.full_logo_url || company.dark_full_logo_url
      : company.dark_full_logo_url || company.full_logo_url;
  if (full) return full;
  return company.theme.websiteMode === "light"
    ? company.logo_url || company.dark_logo_url
    : company.dark_logo_url || company.logo_url;
};

