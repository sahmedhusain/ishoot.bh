import catalog from "./branding-slots.json";
export type AssetType =
  | "LOGO_LIGHT"
  | "LOGO_DARK"
  | "ICON_LIGHT"
  | "ICON_DARK"
  | "ICON"
  | "FAVICON"
  | "STAMP"
  | "SIGNATURE"
  | "LETTERHEAD_HEADER"
  | "LETTERHEAD_FOOTER"
  | "WATERMARK";

export interface AssetSlotConfig {
  key: AssetType;
  translationKey: string;
  descriptionKey: string;
  recommendedFormat: string;
  recommendedDimensions: string;
  isVectorRecommended: boolean;
}

export const BRANDING_ASSET_SLOTS: AssetSlotConfig[] =
  catalog as AssetSlotConfig[];
