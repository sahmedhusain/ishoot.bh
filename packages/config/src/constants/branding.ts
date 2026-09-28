export type AssetType =
  | "LOGO_LIGHT"
  | "LOGO_DARK"
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

export const BRANDING_ASSET_SLOTS: AssetSlotConfig[] = [
  {
    key: "LOGO_LIGHT",
    translationKey: "branding.assets.logoLight",
    descriptionKey: "branding.assets.logoLightDesc",
    recommendedFormat: "SVG / PNG",
    recommendedDimensions: "500x120px",
    isVectorRecommended: true,
  },
  {
    key: "LOGO_DARK",
    translationKey: "branding.assets.logoDark",
    descriptionKey: "branding.assets.logoDarkDesc",
    recommendedFormat: "SVG / PNG",
    recommendedDimensions: "500x120px",
    isVectorRecommended: true,
  },
  {
    key: "ICON",
    translationKey: "branding.assets.icon",
    descriptionKey: "branding.assets.iconDesc",
    recommendedFormat: "SVG / PNG",
    recommendedDimensions: "128x128px",
    isVectorRecommended: true,
  },
  {
    key: "FAVICON",
    translationKey: "branding.assets.favicon",
    descriptionKey: "branding.assets.faviconDesc",
    recommendedFormat: "ICO / PNG / SVG",
    recommendedDimensions: "32x32px or 64x64px",
    isVectorRecommended: false,
  },
  {
    key: "STAMP",
    translationKey: "branding.assets.stamp",
    descriptionKey: "branding.assets.stampDesc",
    recommendedFormat: "PNG (Transparent) / SVG",
    recommendedDimensions: "300x300px",
    isVectorRecommended: true,
  },
  {
    key: "SIGNATURE",
    translationKey: "branding.assets.signature",
    descriptionKey: "branding.assets.signatureDesc",
    recommendedFormat: "PNG (Transparent) / SVG",
    recommendedDimensions: "400x150px",
    isVectorRecommended: true,
  },
  {
    key: "LETTERHEAD_HEADER",
    translationKey: "branding.assets.letterheadHeader",
    descriptionKey: "branding.assets.letterheadHeaderDesc",
    recommendedFormat: "PNG / SVG",
    recommendedDimensions: "1200x200px",
    isVectorRecommended: true,
  },
  {
    key: "LETTERHEAD_FOOTER",
    translationKey: "branding.assets.letterheadFooter",
    descriptionKey: "branding.assets.letterheadFooterDesc",
    recommendedFormat: "PNG / SVG",
    recommendedDimensions: "1200x120px",
    isVectorRecommended: true,
  },
  {
    key: "WATERMARK",
    translationKey: "branding.assets.watermark",
    descriptionKey: "branding.assets.watermarkDesc",
    recommendedFormat: "PNG (Semi-transparent) / SVG",
    recommendedDimensions: "800x800px",
    isVectorRecommended: true,
  },
];
