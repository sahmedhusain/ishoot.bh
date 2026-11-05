import sanitizeHtml from "sanitize-html";
import {
  EMBED_HOSTS,
  EMBED_PRESETS,
  embedSource,
  type EmbedPreset,
} from "@platform/database/cms/blocks";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";

const FRAME_HOSTS = Object.values(EMBED_HOSTS);
type RenderLocale = "en" | "ar";

const iframeTitles: Record<RenderLocale, { video: string; embed: string }> = {
  en: {
    video: enLocale.admin.richText.video,
    embed: enLocale.admin.richText.embed,
  },
  ar: {
    video: arLocale.admin.richText.video,
    embed: arLocale.admin.richText.embed,
  },
};

/** The website-safe HTML of an editor document: only formatting, links, images, tables and known embeds survive. */
function cleanHtml(html: string) {
  return sanitizeHtml(html, {
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
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
    allowedClasses: { div: ["rt-gallery", "rt-embed"] },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "http"], iframe: ["https"] },
    allowProtocolRelative: false,
    // Frames only for the embed providers (and their subdomains); the filter below checks the exact hosts too.
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
        return !FRAME_HOSTS.some((pattern) => pattern.test(host));
      } catch {
        return true;
      }
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer nofollow" },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: "lazy" },
      }),
    },
  });
}

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: JsonNode[];
};

const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

/** dir and text-align, the two paragraph-level attributes the editor sets. */
function blockAttributes(attrs: Record<string, unknown> = {}) {
  const out: string[] = [];
  if (attrs.dir === "rtl" || attrs.dir === "ltr")
    out.push(`dir="${attrs.dir}"`);
  if (
    typeof attrs.textAlign === "string" &&
    /^(left|right|center|justify)$/.test(attrs.textAlign)
  )
    out.push(`style="text-align:${attrs.textAlign}"`);
  return out.length ? ` ${out.join(" ")}` : "";
}

function marks(text: string, list: JsonNode["marks"] = []) {
  return list.reduce((html, mark) => {
    switch (mark.type) {
      case "bold":
        return `<strong>${html}</strong>`;
      case "italic":
        return `<em>${html}</em>`;
      case "underline":
        return `<u>${html}</u>`;
      case "strike":
        return `<s>${html}</s>`;
      case "code":
        return `<code>${html}</code>`;
      case "link":
        return `<a href="${escape(mark.attrs?.href)}">${html}</a>`;
      default:
        return html;
    }
  }, escape(text));
}

/** Editor JSON to HTML, for exactly the nodes in richTextExtensions(); anything else is dropped. */
function toHtml(node: JsonNode, locale: RenderLocale): string {
  const inner = () =>
    (node.content ?? []).map((child) => toHtml(child, locale)).join("");
  const attrs = node.attrs ?? {};
  switch (node.type) {
    case "doc":
      return inner();
    case "text":
      return marks(node.text ?? "", node.marks);
    case "paragraph":
      return `<p${blockAttributes(attrs)}>${inner()}</p>`;
    case "heading": {
      const level = [2, 3, 4].includes(Number(attrs.level))
        ? Number(attrs.level)
        : 2;
      return `<h${level}${blockAttributes(attrs)}>${inner()}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${inner()}</ul>`;
    case "orderedList":
      return `<ol>${inner()}</ol>`;
    case "listItem":
      return `<li${blockAttributes(attrs)}>${inner()}</li>`;
    case "blockquote":
      return `<blockquote${blockAttributes(attrs)}>${inner()}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${inner()}</code></pre>`;
    case "horizontalRule":
      return "<hr />";
    case "hardBreak":
      return "<br />";
    case "image":
      return `<img src="${escape(attrs.src)}" alt="${escape(attrs.alt)}" />`;
    case "figure":
      return `<figure><img src="${escape(attrs.src)}" alt="${escape(attrs.alt)}" />${attrs.caption ? `<figcaption>${escape(attrs.caption)}</figcaption>` : ""}</figure>`;
    case "gallery":
      return `<div class="rt-gallery">${(Array.isArray(attrs.images) ? attrs.images : []).map((image: { src?: string; alt?: string }) => `<img src="${escape(image?.src)}" alt="${escape(image?.alt)}" />`).join("")}</div>`;
    case "youtube": {
      const src = embedSource("youtube", String(attrs.src ?? ""));
      return src
        ? `<div class="rt-embed" data-preset="youtube"><iframe src="${escape(src)}" title="${escape(iframeTitles[locale].video)}" allowfullscreen="true"></iframe></div>`
        : "";
    }
    case "embed": {
      const preset = (EMBED_PRESETS as readonly string[]).includes(
        String(attrs.preset),
      )
        ? (attrs.preset as EmbedPreset)
        : "vimeo";
      const src = embedSource(preset, String(attrs.src ?? ""));
      return src
        ? `<div class="rt-embed" data-preset="${preset}"><iframe src="${escape(src)}" title="${escape(iframeTitles[locale].embed)}" allowfullscreen="true"></iframe></div>`
        : "";
    }
    case "table":
      return `<table><tbody>${inner()}</tbody></table>`;
    case "tableRow":
      return `<tr>${inner()}</tr>`;
    case "tableHeader":
    case "tableCell": {
      const tag = node.type === "tableHeader" ? "th" : "td";
      const span = [
        Number(attrs.colspan) > 1 ? ` colspan="${Number(attrs.colspan)}"` : "",
        Number(attrs.rowspan) > 1 ? ` rowspan="${Number(attrs.rowspan)}"` : "",
      ].join("");
      return `<${tag}${span}>${inner()}</${tag}>`;
    }
    default:
      return "";
  }
}

/** Renders a stored editor document to website HTML; anything that is not a document renders as nothing. */
export function renderRichText(
  doc: unknown,
  locale: RenderLocale = "en",
): string {
  if (!doc || typeof doc !== "object" || (doc as JsonNode).type !== "doc")
    return "";
  return cleanHtml(toHtml(doc as JsonNode, locale));
}
