/** Branding shown on the public auth screens (login, forgot and reset password). */
export interface AuthBrandingProps {
  companyName: string;
  /** Artwork for light backgrounds. */
  logoUrl?: string | null;
  iconUrl?: string | null;
  fullLogoUrl?: string | null;
  /** Artwork for dark backgrounds; the light version is used when missing. */
  darkLogoUrl?: string | null;
  darkIconUrl?: string | null;
  darkFullLogoUrl?: string | null;
}
