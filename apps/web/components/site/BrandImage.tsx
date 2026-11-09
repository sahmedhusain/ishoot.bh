"use client";

import type { PublicCompanySettings } from "@platform/database/types";
import { ContentImage } from "../shared/ContentImage";

export function BrandImage({
  company,
  icon = false,
  className = "",
}: {
  company: PublicCompanySettings;
  icon?: boolean;
  className?: string;
}) {
  const light = icon ? company.icon_url : company.logo_url;
  const dark = icon ? company.dark_icon_url : company.dark_logo_url;
  return (
    <span className={className}>
      <ContentImage
        src={light || dark}
        alt={icon ? "" : company.company_name_en}
        fallbackText={icon ? undefined : company.company_name_en}
        width={icon ? 40 : 240}
        height={icon ? 40 : 60}
        className="site-logo-light h-full w-auto max-w-full object-contain"
      />
      <ContentImage
        src={dark || light}
        alt={icon ? "" : company.company_name_en}
        fallbackText={icon ? undefined : company.company_name_en}
        width={icon ? 40 : 240}
        height={icon ? 40 : 60}
        className="site-logo-dark h-full w-auto max-w-full object-contain"
      />
    </span>
  );
}
