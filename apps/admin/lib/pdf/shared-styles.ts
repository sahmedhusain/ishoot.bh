import { Font } from "@react-pdf/renderer";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileBytes } from "@platform/api-client";
import {
  FONT_LIBRARY,
  type BrandTheme,
  type FontChoice,
} from "@platform/database/constants/theme";

export const PDF_FONT = "CompanyPdf";

Font.registerHyphenationCallback((word) => [word]);

let registeredKey: string | null = null;
const googleSources = new Map<string, Record<number, string>>();

const nearest = (files: { weight: number; url: string }[], weight: number) =>
  [...files].sort(
    (a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight),
  )[0];

function bundledFontRoots(): string[] {
  return [
    path.resolve(process.cwd(), "assets/fonts"),
    path.resolve(process.cwd(), "apps/admin/assets/fonts"),
    "/app/apps/admin/assets/fonts",
    "/app/assets/fonts",
  ];
}

function findBundledTtfPair(
  family?: string,
): { regular: string; bold: string } | null {
  const preferRoboto =
    Boolean(family) && /roboto|inter|public sans|plus jakarta|dm sans/i.test(family!);
  const pairs: Array<[string, string]> = preferRoboto
    ? [
        ["Roboto-Regular.ttf", "Roboto-Bold.ttf"],
        ["IBMPlexSansArabic-Regular.ttf", "IBMPlexSansArabic-Bold.ttf"],
      ]
    : [
        ["IBMPlexSansArabic-Regular.ttf", "IBMPlexSansArabic-Bold.ttf"],
        ["Roboto-Regular.ttf", "Roboto-Bold.ttf"],
      ];

  for (const root of bundledFontRoots()) {
    for (const [regRel, boldRel] of pairs) {
      const reg = path.join(root, regRel);
      const bold = path.join(root, boldRel);
      if (existsSync(reg) && existsSync(bold)) {
        return { regular: reg, bold };
      }
    }
  }
  return null;
}

function findAnyLocalArabicTtf(): { regular: string; bold: string } | null {
  for (const root of bundledFontRoots()) {
    const reg = path.join(root, "IBMPlexSansArabic-Regular.ttf");
    const bold = path.join(root, "IBMPlexSansArabic-Bold.ttf");
    if (existsSync(reg) && existsSync(bold)) {
      return { regular: reg, bold };
    }
  }
  return null;
}

async function uploadedFontSource(url: string) {
  const extension = path.extname(url).toLowerCase();
  // @react-pdf/font (fontkit) does not support .woff2 decompression
  if (extension === ".woff2") return null;
  const target = path.join(
    tmpdir(),
    "platform-pdf-fonts",
    createHash("sha256").update(url).digest("hex") + extension,
  );
  if (await stat(target).then(() => true, () => false)) return target;
  const bytes = await readFileBytes(url);
  if (!bytes) return null;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return target;
}

async function googleFontSources(family: string) {
  const cached = googleSources.get(family);
  if (cached) return cached;
  const known = FONT_LIBRARY.find((f) => f.family === family)?.weights;
  const weights = known
    ? [400, 700].filter((w) => known.includes(w))
    : [400, 700];
  const query = weights.length ? `:wght@${weights.join(";")}` : "";
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}${query}`,
    {
      headers: {
        // Legacy UA encourages Google Fonts to serve .ttf instead of .woff2
        "User-Agent":
          "Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/1.9.8 Safari/534.34",
      },
      signal: AbortSignal.timeout(4000),
    },
  )
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");
  const sources: Record<number, string> = {};
  for (const block of css.split("@font-face").slice(1)) {
    const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1]);
    const src = block.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (
      weight &&
      src &&
      !src.toLowerCase().endsWith(".woff2") &&
      !sources[weight]
    ) {
      sources[weight] = src;
    }
  }
  if (Object.keys(sources).length) googleSources.set(family, sources);
  return sources;
}

async function fontSources(
  font?: FontChoice,
): Promise<{ regular: string; bold: string } | null> {
  // Prefer local bundled Arabic+Latin TTF first if the theme uses IBM Plex Sans Arabic / custom upload woff2
  const bundledArabic = findAnyLocalArabicTtf();
  if (font?.kind === "upload") {
    const regular = await uploadedFontSource(nearest(font.files, 400).url);
    const bold = await uploadedFontSource(nearest(font.files, 700).url);
    if (regular && bold) return { regular, bold };
    if (bundledArabic) return bundledArabic;
  }
  if (font?.kind === "google") {
    const localMatch = findBundledTtfPair(font.family);
    if (localMatch && /ibm plex|roboto/i.test(font.family)) {
      return localMatch;
    }
    const sources = await googleFontSources(font.family);
    const regular = sources[400] ?? Object.values(sources)[0];
    if (regular) {
      return { regular, bold: sources[700] ?? regular };
    }
  }
  return bundledArabic ?? findBundledTtfPair();
}

export async function registerPdfFont(theme?: BrandTheme): Promise<boolean> {
  const key = JSON.stringify(theme?.fonts?.body ?? "default-bundled");
  if (registeredKey === key) return true;
  try {
    const sources = await fontSources(theme?.fonts?.body);
    if (!sources) return false;
    Font.register({
      family: PDF_FONT,
      fonts: [
        { src: sources.regular, fontWeight: "normal" },
        { src: sources.bold, fontWeight: "bold" },
      ],
    });
    registeredKey = key;
    return true;
  } catch (e) {
    console.warn("Could not load configured PDF font, trying bundled TTF fallback", e);
    const fallback = findAnyLocalArabicTtf();
    if (fallback) {
      try {
        Font.register({
          family: PDF_FONT,
          fonts: [
            { src: fallback.regular, fontWeight: "normal" },
            { src: fallback.bold, fontWeight: "bold" },
          ],
        });
        registeredKey = key;
        return true;
      } catch {}
    }
    return false;
  }
}
