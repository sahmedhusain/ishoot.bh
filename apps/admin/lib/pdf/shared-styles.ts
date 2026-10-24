import { Font } from "@react-pdf/renderer";
import path from "path";
import { generateDownloadUrl, isSupabaseStorageConfigured, uploadRoot, uploadStorageLocation } from "@platform/database";
import type { BrandTheme, FontChoice } from "@platform/database/constants/theme";

/** The single family every generated document uses; it is registered from the company theme's body font. */
export const PDF_FONT = "CompanyPdf";

// Arabic and English words are never hyphenated.
Font.registerHyphenationCallback((word) => [word]);

let registeredKey: string | null = null;
const googleSources = new Map<string, Record<number, string>>();

const nearest = (files: { weight: number; url: string }[], weight: number) =>
  [...files].sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight))[0];

async function uploadedFontSource(url: string) {
  if (isSupabaseStorageConfigured()) {
    const location = uploadStorageLocation(url, true);
    return generateDownloadUrl(location.bucket, location.path, 600);
  }
  return path.join(uploadRoot(), url.slice("/api/files/".length));
}

/** Google serves complete TrueType files (Arabic and Latin together) to non-browser clients. */
async function googleFontSources(family: string) {
  const cached = googleSources.get(family);
  if (cached) return cached;
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;700`, {
    signal: AbortSignal.timeout(8000),
  }).then((r) => (r.ok ? r.text() : ""));
  const sources: Record<number, string> = {};
  for (const block of css.split("@font-face").slice(1)) {
    const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1]);
    const src = block.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (weight && src && !sources[weight]) sources[weight] = src;
  }
  if (Object.keys(sources).length) googleSources.set(family, sources);
  return sources;
}

async function fontSources(font: FontChoice): Promise<{ regular: string; bold: string } | null> {
  if (font.kind === "upload") {
    return {
      regular: await uploadedFontSource(nearest(font.files, 400).url),
      bold: await uploadedFontSource(nearest(font.files, 700).url),
    };
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
