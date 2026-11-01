import { Font } from "@react-pdf/renderer";
import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileBytes } from "@platform/api-client";
import {
  FONT_LIBRARY,
  type BrandTheme,
  type FontChoice,
} from "@platform/database/constants/theme";

/** The single family every generated document uses; it is registered from the company theme's body font. */
export const PDF_FONT = "CompanyPdf";

// Arabic and English words are never hyphenated.
Font.registerHyphenationCallback((word) => [word]);

let registeredKey: string | null = null;
const googleSources = new Map<string, Record<number, string>>();

const nearest = (files: { weight: number; url: string }[], weight: number) =>
  [...files].sort(
    (a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight),
  )[0];

/**
 * The renderer loads fonts from a path, so an uploaded font is copied once to a temporary folder. Uploaded files
 * never change under the same address, so the copy never goes stale.
 */
async function uploadedFontSource(url: string) {
  const extension = path.extname(url);
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

/** Google serves complete TrueType files (Arabic and Latin together) to non-browser clients. */
async function googleFontSources(family: string) {
  const cached = googleSources.get(family);
  if (cached) return cached;
  // Asking for a weight the family lacks fails the whole request (Lalezar, Bebas Neue… have only 400).
  const known = FONT_LIBRARY.find((f) => f.family === family)?.weights;
  const weights = known
    ? [400, 700].filter((w) => known.includes(w))
    : [400, 700];
  const query = weights.length ? `:wght@${weights.join(";")}` : "";
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}${query}`,
    {
      signal: AbortSignal.timeout(8000),
    },
  ).then((r) => (r.ok ? r.text() : ""));
  const sources: Record<number, string> = {};
  for (const block of css.split("@font-face").slice(1)) {
    const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1]);
    const src = block.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (weight && src && !sources[weight]) sources[weight] = src;
  }
  if (Object.keys(sources).length) googleSources.set(family, sources);
  return sources;
}

async function fontSources(
  font: FontChoice,
): Promise<{ regular: string; bold: string } | null> {
  if (font.kind === "upload") {
    const regular = await uploadedFontSource(nearest(font.files, 400).url);
    const bold = await uploadedFontSource(nearest(font.files, 700).url);
    return regular && bold ? { regular, bold } : null;
  }
  if (font.kind === "google") {
    const sources = await googleFontSources(font.family);
    const regular = sources[400] ?? Object.values(sources)[0];
    return regular ? { regular, bold: sources[700] ?? regular } : null;
  }
  return null;
}

/**
 * Registers the company's body font for PDFs (once per theme). Returns false when no font could be loaded,
 * in which case documents fall back to the built-in Helvetica.
 */
export async function registerPdfFont(theme: BrandTheme): Promise<boolean> {
  const key = JSON.stringify(theme.fonts.body);
  if (registeredKey === key) return true;
  try {
    const sources = await fontSources(theme.fonts.body);
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
    console.warn("Could not load the company font for PDF documents", e);
    return false;
  }
}
