import sanitizeHtml from "sanitize-html";
import { EMBED_HOSTS } from "@platform/database/cms/blocks";

const frameHosts = Object.values(EMBED_HOSTS);

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(typeof html === "string" ? html : "", {
    allowedTags: [
      "h2",
      "h3",
      "h4",
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "code",
      "pre",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "hr",
      "img",
      "figure",
      "figcaption",
      "div",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "iframe",
    ],
    allowedAttributes: {
      "*": ["dir", "style"],
      a: ["href", "rel", "title"],
      img: ["src", "alt", "loading"],
      div: ["class", "data-preset"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      iframe: ["src", "title", "loading", "allowfullscreen"],
    },
    allowedStyles: {
      "*": { "text-align": [/^(left|right|center|justify)$/] },
    },
    allowedClasses: { div: ["rt-gallery", "rt-embed"] },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["https", "http"],
      iframe: ["https"],
    },
    allowProtocolRelative: false,
    allowedIframeDomains: [
      "youtube-nocookie.com",
      "youtube.com",
      "vimeo.com",
      "instagram.com",
      "google.com",
      "calendly.com",
      "typeform.com",
    ],
    exclusiveFilter: (frame) => {
      if (frame.tag !== "iframe") return false;
      try {
        const host = new URL(frame.attribs.src ?? "").hostname;
        return !frameHosts.some((pattern) => pattern.test(host));
      } catch {
        return true;
      }
    },
    transformTags: {
      a: (tagName, attributes) => ({
        tagName,
        attribs: { ...attributes, rel: "noopener noreferrer nofollow" },
      }),
      img: (tagName, attributes) => ({
        tagName,
        attribs: { ...attributes, loading: "lazy" },
      }),
    },
  });
}
