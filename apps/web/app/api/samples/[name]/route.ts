import { NextResponse } from "next/server";
import { measureOperation } from "@platform/database";
import { getPublicCompanySettings } from "../../../../lib/company";

/**
 * Abstract artwork for sample content ("banner-1.svg" … "item-6.svg"), drawn in the company's own colours so a
 * sample website already looks like the brand. Fixed shapes and validated colours only; nothing from the request
 * reaches the markup except the choice of one of twelve pictures.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  return measureOperation("web:samples:GET", async () => {
    const { name } = await params;
    const match = /^(banner|item)-([1-6])\.svg$/.exec(name);
    if (!match) return new NextResponse(null, { status: 404 });
    const { theme } = await getPublicCompanySettings();
    const [kind, n] = [match[1], Number(match[2])];
    const [w, h] = kind === "banner" ? [1600, 900] : [800, 600];
    const { primary, accent } = theme;
    const shapes = [
      `<circle cx="${w * (0.2 + 0.1 * n)}" cy="${h * 0.35}" r="${h * (0.25 + 0.03 * n)}" fill="${accent}" opacity="0.55"/>`,
      `<rect x="${w * 0.55}" y="${h * (0.15 + 0.05 * (n % 3))}" width="${w * 0.35}" height="${h * 0.55}" rx="${h * 0.08}" fill="#ffffff" opacity="0.12" transform="rotate(${n * 7 - 20} ${w * 0.7} ${h * 0.4})"/>`,
      `<circle cx="${w * (0.85 - 0.08 * n)}" cy="${h * 0.85}" r="${h * 0.18}" fill="#ffffff" opacity="0.08"/>`,
      `<path d="M0 ${h * 0.78} C ${w * 0.3} ${h * (0.6 + 0.04 * n)}, ${w * 0.6} ${h * 0.95}, ${w} ${h * 0.7} L ${w} ${h} L 0 ${h} Z" fill="${accent}" opacity="0.25"/>`,
    ].join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${accent}" stop-opacity="0.85"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${shapes}</svg>`;
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
