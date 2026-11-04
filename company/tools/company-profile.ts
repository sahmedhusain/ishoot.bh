import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isFontMimeType, normalizeTheme, type BrandTheme, type FontChoice } from "../../apps/admin/lib/database/constants/theme";
import { apiTimeoutMs, apiUrl } from "../../apps/admin/lib/api/config";
import { serviceToken } from "../../apps/admin/lib/api/service-token";
import { storeFile } from "../../apps/admin/lib/api/files";
import { detectFileType, extensionFor } from "../../contracts/src";

const BRAND_SLOTS = {
  logo: { field: "logoUrl", assetKeys: ["logo_light"], title: "Logo for light backgrounds" },
  darkLogo: { field: "darkLogoUrl", assetKeys: ["logo_dark"], title: "Logo for dark backgrounds" },
  icon: { field: "iconUrl", assetKeys: ["icon_light", "favicon"], title: "Icon for light backgrounds" },
  darkIcon: { field: "darkIconUrl", assetKeys: ["icon_dark"], title: "Icon for dark backgrounds" },
  fullLogo: { field: "fullLogoUrl", assetKeys: ["full_logo_light"], title: "Full-sized logo for light backgrounds" },
  darkFullLogo: { field: "darkFullLogoUrl", assetKeys: ["full_logo_dark"], title: "Full-sized logo for dark backgrounds" },
  header: { field: "documentHeaderUrl", assetKeys: ["letterhead_header"], title: "Document header banner" },
  footer: { field: "documentFooterUrl", assetKeys: ["letterhead_footer"], title: "Document footer banner" },
  stamp: { field: "stampUrl", assetKeys: ["stamp"], title: "Company stamp" },
  signature: { field: "signatureUrl", assetKeys: ["signature"], title: "Authorised signature" },
} as const;
type BrandSlot = keyof typeof BRAND_SLOTS;
type ProfileFont = FontChoice | { kind: "upload"; family: string; files: { weight: number; file: string }[] };
interface ProfileTheme extends Omit<BrandTheme, "fonts"> { fonts: { body: ProfileFont; heading: ProfileFont } }

export interface CompanyProfile {
  name: string;
  dir: string;
  display: { nameEn: string; nameAr: string };
  company: Record<string, unknown> & { companyNameEn: string; companyNameAr: string };
  assets: Partial<Record<BrandSlot, string>>;
  theme: ProfileTheme;
}

const PROFILE_NAME = /^[a-z0-9][a-z0-9-]{0,40}$/;
const profilesDir = () => path.resolve(__dirname, "..", "profiles");

export function loadCompanyProfile(name = process.env.COMPANY_PROFILE?.trim() || "demo"): CompanyProfile {
  if (name === "all") name = "demo";
  if (!PROFILE_NAME.test(name)) throw new Error(`Invalid company profile name: ${name}`);
  const dir = path.join(profilesDir(), name);
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  if (!fs.existsSync(path.join(dir, "company.json"))) throw new Error(`Company profile not found: company/profiles/${name}`);
  const { company, assets = {}, display } = read("company.json");
  if (!company?.companyNameEn?.trim() || !company?.companyNameAr?.trim()) throw new Error(`company/profiles/${name}/company.json needs companyNameEn and companyNameAr`);
  return { name, dir, company, assets, theme: fs.existsSync(path.join(dir, "theme.json")) ? read("theme.json") : {}, display: { nameEn: display?.nameEn || company.companyNameEn, nameAr: display?.nameAr || company.companyNameAr } };
}

export function profileAssetPath(profile: CompanyProfile, relative: string) {
  const root = path.join(profile.dir, "assets");
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw new Error(`Profile asset outside assets/: ${relative}`);
  return target;
}

/** Uploads profile artwork through the files service; no app-local storage is used. */
export async function importProfileFile(profile: CompanyProfile, relative: string, folder: "brand" | "vault" | "general" = "brand") {
  const bytes = fs.readFileSync(profileAssetPath(profile, relative));
  const mimeType = detectFileType(bytes);
  if (!mimeType) throw new Error(`Unsupported profile asset: ${relative}`);
  if (isFontMimeType(mimeType) && folder !== "brand") throw new Error(`Fonts belong in the brand folder: ${relative}`);
  const stem = path.basename(relative).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60);
  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const fileUrl = `/api/files/${folder}/${stem}_${hash}.${extensionFor(mimeType)}`;
  await storeFile({ fileUrl }, bytes, { fileName: path.basename(relative), ifExists: "keep" });
  return fileUrl;
}

async function profileTheme(profile: CompanyProfile): Promise<BrandTheme> {
  const upload = async (choice: ProfileFont): Promise<ProfileFont> => {
    if (!choice || choice.kind !== "upload") return choice;
    const files = (choice as { files: { weight: number; file: string }[] }).files;
    return { ...choice, files: await Promise.all(files.map(async ({ weight, file }) => ({ weight, url: await importProfileFile(profile, file) }))) } as ProfileFont;
  };
  const fonts = profile.theme.fonts ?? ({} as ProfileTheme["fonts"]);
  return normalizeTheme({ ...profile.theme, fonts: { body: await upload(fonts.body), heading: await upload(fonts.heading) } });
}

async function systemRequest(pathname: string, body: unknown) {
  const response = await fetch(`${apiUrl()}${pathname}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${await serviceToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!response.ok) throw new Error(`System service PUT ${pathname} failed (${response.status}): ${await response.text()}`);
}

/** Installs a profile through system/files service APIs. */
export async function installCompanyProfile(profile: CompanyProfile, actorId = "seed") {
  const urls: Partial<Record<string, string>> = {};
  for (const [slot, file] of Object.entries(profile.assets) as [BrandSlot, string][]) if (file) urls[BRAND_SLOTS[slot].field] = await importProfileFile(profile, file);
  for (const [slot, config] of Object.entries(BRAND_SLOTS) as [BrandSlot, (typeof BRAND_SLOTS)[BrandSlot]][]) {
    const fileUrl = urls[config.field];
    if (!fileUrl) continue;
    for (const key of config.assetKeys) await systemRequest(`/v1/system/company/assets/${key}`, { title: config.title, fileUrl, actorId });
  }
  const { currencyDecimals, ...companyValues } = profile.company;
  await systemRequest("/v1/system/company", { values: { ...companyValues, ...urls, theme: await profileTheme(profile) }, actorId });
}
