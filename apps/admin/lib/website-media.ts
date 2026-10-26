/** Seeded website media lives on the public site (e.g. /banners/x.jpg); admin uploads (/uploads/…) stay local. */
export function websiteMedia(src: string): string {
  const web = process.env.NEXT_PUBLIC_WEB_URL;
  return src.startsWith("/") &&
    !src.startsWith("//") &&
    !src.startsWith("/uploads/") &&
    web
    ? `${web.replace(/\/$/, "")}${src}`
    : src;
}
