// Company profiles live outside the apps, in company/profiles/<name>/ at the repository root:
//   company.json  identity and configuration (CompanySetting fields), a short display name, and the asset file
//                 for each brand slot
//   theme.json    colours, fonts, radius and default mode; uploaded font files are paths inside the profile
//   assets/       logos, stamp, signatures, fonts, media and documents
// Installing a profile copies its files into upload storage and points the company settings at them, so no
// app ever ships a company's files in its own public folder.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import { FONT_FILE_TYPES, isFontMimeType, normalizeTheme, type BrandTheme, type FontChoice } from "../../packages/database/src/constants/theme";
import { detectFileType } from "../../packages/database/src/services/storage";
import { storeFileBytes, workspaceRoot } from "../../packages/database/src/services/uploads";

type Db = PrismaClient | Prisma.TransactionClient;

/** Brand slots: which company setting each profile asset fills, and the CompanyAsset rows that mirror it. */
const BRAND_SLOTS = {
  logo: { field: "logoUrl", assetKeys: ["logo_light"], title: "Logo for light backgrounds" },
  darkLogo: { field: "darkLogoUrl", assetKeys: ["logo_dark"], title: "Logo for dark backgrounds" },
  icon: { field: "iconUrl", assetKeys: ["icon_light", "favicon"], title: "Icon for light backgrounds" },
  darkIcon: { field: "darkIconUrl", assetKeys: ["icon_dark"], title: "Icon for dark backgrounds" },
  stamp: { field: "stampUrl", assetKeys: ["stamp"], title: "Company stamp" },
  signature: { field: "signatureUrl", assetKeys: ["signature"], title: "Authorised signature" },
} as const;
type BrandSlot = keyof typeof BRAND_SLOTS;

type ProfileFont = FontChoice | { kind: "upload"; family: string; files: { weight: number; file: string }[] };
interface ProfileTheme extends Omit<BrandTheme, "fonts"> {
  fonts: { body: ProfileFont; heading: ProfileFont };
}

export interface CompanyProfile {
  name: string;
  dir: string;
  /** Short name used in demo text and greetings, e.g. "Acme" for "Acme Trading W.L.L.". */
  display: { nameEn: string; nameAr: string };
  company: Record<string, unknown> & { companyNameEn: string; companyNameAr: string };
  assets: Partial<Record<BrandSlot, string>>;
  theme: ProfileTheme;
}

const PROFILE_NAME = /^[a-z0-9][a-z0-9-]{0,40}$/;
const UPLOAD_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf", ...Object.fromEntries(Object.entries(FONT_FILE_TYPES).map(([mime, t]) => [mime, t.extension])) };

function companyProfilesDir() {
  return path.join(workspaceRoot(), "company", "profiles");
}

/** The profile named by COMPANY_PROFILE, or the neutral demo profile. */
export function loadCompanyProfile(name = process.env.COMPANY_PROFILE?.trim() || "demo"): CompanyProfile {
  if (!PROFILE_NAME.test(name)) throw new Error(`Invalid company profile name: ${name}`);
  const dir = path.join(companyProfilesDir(), name);
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  if (!fs.existsSync(path.join(dir, "company.json"))) throw new Error(`Company profile not found: company/profiles/${name}`);
  const { company, assets = {}, display } = read("company.json");
  if (!company?.companyNameEn?.trim() || !company?.companyNameAr?.trim()) throw new Error(`company/profiles/${name}/company.json needs companyNameEn and companyNameAr`);
  const theme = fs.existsSync(path.join(dir, "theme.json")) ? read("theme.json") : {};
  return { name, dir, company, assets, theme, display: { nameEn: display?.nameEn || company.companyNameEn, nameAr: display?.nameAr || company.companyNameAr } };
}

/** Absolute path of a file inside a profile's assets folder, refusing anything that escapes it. */
export function profileAssetPath(profile: CompanyProfile, relative: string) {
  const root = path.join(profile.dir, "assets");
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) throw new Error(`Profile asset outside assets/: ${relative}`);
  return target;
}

/**
 * Stores a profile file in upload storage and registers it as an already-claimed upload owned by `ownerId`.
 * The name carries a content hash, so installing the same profile twice reuses the same file.
 */
export async function importProfileFile(db: Db, profile: CompanyProfile, relative: string, ownerId: string, folder: "brand" | "vault" | "general" = "brand") {
  const bytes = fs.readFileSync(profileAssetPath(profile, relative));
  const mimeType = detectFileType(bytes);
  if (!mimeType) throw new Error(`Unsupported file type (use PNG, JPEG, WebP, PDF or a WOFF2, WOFF, TTF or OTF font): ${relative}`);
  if (isFontMimeType(mimeType) && folder !== "brand") throw new Error(`Fonts belong in the brand folder: ${relative}`);
  const stem = path.basename(relative).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60);
  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const fileUrl = `/api/files/${folder}/${stem}_${hash}.${UPLOAD_EXT[mimeType]}`;
  const isPublic = folder === "brand";
  await storeFileBytes(fileUrl, bytes, mimeType, isPublic);
  await db.uploadObject.upsert({
    where: { fileUrl },
    update: {},
    create: {
      fileUrl,
      ownerId,
      fileName: path.basename(relative),
      fileSize: bytes.length,
      mimeType,
      isPublic,
      claimedAt: new Date(),
      expiresAt: new Date("2999-12-31T00:00:00Z"),
    },
  });
  return fileUrl;
}

/** The profile theme with uploaded font files stored and replaced by their URLs. */
async function installTheme(db: Db, profile: CompanyProfile, ownerId: string): Promise<BrandTheme> {
  const font = async (choice: ProfileFont | undefined): Promise<FontChoice | undefined> => {
    if (!choice || choice.kind !== "upload") return choice;
    const files = [];
    for (const f of choice.files as { weight: number; file?: string; url?: string }[]) {
      files.push({ weight: f.weight, url: f.file ? await importProfileFile(db, profile, f.file, ownerId) : String(f.url) });
    }
    return { kind: "upload", family: choice.family, files };
  };
  const fonts = profile.theme.fonts ?? {};
  return normalizeTheme({ ...profile.theme, fonts: { body: await font(fonts.body), heading: await font(fonts.heading) } });
}

/**
 * Writes the profile's identity, brand files and theme into the single CompanySetting row (created if missing)
 * and the matching CompanyAsset rows. `markSetupComplete` skips the first-run wizard (seeds, CI, migrations).
 */
export async function installCompanyProfile(db: Db, profile: CompanyProfile, ownerId: string, options: { markSetupComplete?: boolean } = {}) {
  const urls: Partial<Record<string, string>> = {};
  for (const [slot, file] of Object.entries(profile.assets) as [BrandSlot, string][]) {
    if (!BRAND_SLOTS[slot] || !file) continue;
    urls[BRAND_SLOTS[slot].field] = await importProfileFile(db, profile, file, ownerId);
  }
  const theme = await installTheme(db, profile, ownerId);
  const data = {
    ...profile.company,
    ...urls,
    theme: theme as unknown as Prisma.InputJsonValue,
    ...(options.markSetupComplete ? { setupCompletedAt: new Date() } : {}),
  } as Prisma.CompanySettingUncheckedCreateInput;
  const existing = await db.companySetting.findFirst({ select: { id: true } });
  const company = existing
    ? await db.companySetting.update({ where: { id: existing.id }, data })
    : await db.companySetting.create({ data });
  for (const { field, assetKeys, title } of Object.values(BRAND_SLOTS)) {
    const fileUrl = urls[field];
    if (!fileUrl) continue;
    const mimeType = fileUrl.endsWith(".png") ? "image/png" : fileUrl.endsWith(".webp") ? "image/webp" : "image/jpeg";
    for (const assetKey of assetKeys) {
      await db.companyAsset.upsert({
        where: { assetKey },
        update: { fileUrl, mimeType, title },
        create: { assetKey, fileUrl, mimeType, title },
      });
    }
  }
  return company;
}

/** Columns that may still point at files the apps used to ship in public/ (before company files moved here). */
const LEGACY_FILE_COLUMNS: [table: string, column: string][] = [
  ["User", "signatureUrl"], ["User", "avatarUrl"], ["CompanySetting", "logoUrl"], ["CompanySetting", "darkLogoUrl"],
  ["CompanySetting", "iconUrl"], ["CompanySetting", "darkIconUrl"], ["CompanySetting", "stampUrl"], ["CompanySetting", "signatureUrl"],
  ["CompanyAsset", "fileUrl"], ["HeroBanner", "mediaUrl"], ["HeroBanner", "posterUrl"], ["PortfolioItem", "thumbnailUrl"],
  ["Service", "imageUrl"], ["StudioEquipment", "imageUrl"], ["Invoice", "signerSignatureUrl"], ["Payment", "signerSignatureUrl"],
  ["Quotation", "signerSignatureUrl"], ["MinuteOfMeeting", "signatureUrl"], ["SignatureChange", "signatureUrl"],
  ["AssetHandover", "creatorSignatureUrl"], ["Announcement", "signatureUrl"], ["OfficialLetter", "signatureUrl"],
];

/** The profile file that replaces a legacy public path, e.g. /brand/signatures/x.svg -> brand/signatures/x.png. */
function legacyProfileFile(profile: CompanyProfile, url: string) {
  const match = url.match(/^\/(brand|banners)\/([a-zA-Z0-9/_-]+)\.(svg|png|jpe?g|webp)$/);
  if (!match) return null;
  const base = match[1] === "banners" ? `media/banners/${match[2]}` : `brand/${match[2]}`;
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const candidate = `${base}.${ext}`;
    if (fs.existsSync(profileAssetPath(profile, candidate))) return candidate;
  }
  return null;
}

/**
 * Moves an existing install off files the apps used to ship in public/: every stored /brand/… or /banners/…
 * path with a matching file in the profile is uploaded and replaced by its upload URL. Returns the paths that
 * had no matching profile file, so an operator can supply them.
 */
export async function remapLegacyPublicFiles(db: Db, profile: CompanyProfile, ownerId: string) {
  const missing = new Set<string>();
  const uploaded = new Map<string, string>();
  for (const [table, column] of LEGACY_FILE_COLUMNS) {
    // Identifiers come from the fixed list above, never from input.
    const rows = await db.$queryRawUnsafe<{ value: string }[]>(
      `SELECT DISTINCT "${column}" AS value FROM "${table}" WHERE "${column}" LIKE '/brand/%' OR "${column}" LIKE '/banners/%'`,
    );
    for (const { value } of rows) {
      const file = legacyProfileFile(profile, value);
      if (!file) {
        missing.add(value);
        continue;
      }
      if (!uploaded.has(file)) uploaded.set(file, await importProfileFile(db, profile, file, ownerId));
      await db.$executeRawUnsafe(`UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`, uploaded.get(file), value);
    }
  }
  return [...missing];
}
