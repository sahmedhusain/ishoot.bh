import type { PublicCompanySettings } from "@platform/database/types";

type Brand = Pick<
  PublicCompanySettings,
  "theme" | "logo_url" | "dark_logo_url" | "icon_url" | "dark_icon_url"
>;

/** The logo made for the website's background: the dark-background version on a dark website, else the normal one. */
export const siteLogo = (company: Brand) =>
  company.theme.websiteMode === "light"
    ? company.logo_url || company.dark_logo_url
    : company.dark_logo_url || company.logo_url;

export const siteIcon = (company: Brand) =>
  company.theme.websiteMode === "light"
    ? company.icon_url || company.dark_icon_url
    : company.dark_icon_url || company.icon_url;
