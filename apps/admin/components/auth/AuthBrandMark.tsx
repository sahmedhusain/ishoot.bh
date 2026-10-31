import type { AuthBrandingProps } from "../../types/auth";
import { ContentImage } from "../shared/ContentImage";

/** The company icon and logo, swapping to the dark-background artwork in dark mode. */
export function AuthBrandMark({ companyName, logoUrl, iconUrl, fullLogoUrl, darkLogoUrl, darkIconUrl, darkFullLogoUrl }: AuthBrandingProps) {
  const pair = (light: string | null | undefined, dark: string | null | undefined, className: string, size: { width: number; height: number }) => {
    const darkSrc = dark || light;
    if (!light && !darkSrc) return null;
    return (
      <>
        {light ? <ContentImage {...size} src={light} alt={companyName} className={`${className} dark:hidden`} /> : null}
        {darkSrc ? <ContentImage {...size} src={darkSrc} alt={companyName} className={`${className} ${light ? "hidden dark:block" : ""}`} /> : null}
      </>
    );
  };
  if (fullLogoUrl || darkFullLogoUrl) {
    return (
      <div className="flex items-center justify-center">
        {pair(fullLogoUrl, darkFullLogoUrl, "h-9 w-auto object-contain", { width: 280, height: 60 })}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-3">
      {pair(iconUrl, darkIconUrl, "h-10 w-auto object-contain shrink-0", { width: 40, height: 40 })}
      {pair(logoUrl, darkLogoUrl, "h-7 w-auto object-contain", { width: 240, height: 60 })}
    </div>
  );
}
