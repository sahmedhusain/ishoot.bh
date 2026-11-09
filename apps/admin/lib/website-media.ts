export function websiteMedia(src: string): string {
  const web = process.env.NEXT_PUBLIC_WEB_URL;
  return src.startsWith("/") &&
    !src.startsWith("//") &&
    !src.startsWith("/uploads/") &&
    web
    ? `${web.replace(/\/$/, "")}${src}`
    : src;
}
