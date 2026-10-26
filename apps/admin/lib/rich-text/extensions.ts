import {
  Extension,
  Node,
  mergeAttributes,
  type Extensions,
} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { TableKit } from "@tiptap/extension-table";
import {
  embedSource,
  EMBED_PRESETS,
  type EmbedPreset,
} from "@platform/database/cms/blocks";

// One extension list for the editor (browser) and the HTML renderer (server), so both read documents the same way.

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textDirection: {
      setTextDirection: (dir: "rtl" | "ltr" | null) => ReturnType;
    };
    figure: {
      setFigure: (attrs: {
        src: string;
        alt?: string;
        caption?: string;
      }) => ReturnType;
    };
    gallery: {
      setGallery: (images: { src: string; alt?: string }[]) => ReturnType;
    };
    embed: {
      setEmbed: (attrs: { preset: EmbedPreset; src: string }) => ReturnType;
    };
  }
}

/** Right-to-left or left-to-right per paragraph, heading, quote or list item (dir attribute). */
const TextDirection = Extension.create({
  name: "textDirection",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote", "listItem"],
        attributes: {
          dir: {
            default: null,
            parseHTML: (element) =>
              ["rtl", "ltr"].includes(element.getAttribute("dir") ?? "")
                ? element.getAttribute("dir")
                : null,
            renderHTML: (attributes) =>
              attributes.dir ? { dir: attributes.dir } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextDirection:
        (dir) =>
        ({ commands }) =>
          ["paragraph", "heading", "blockquote", "listItem"]
            .map((type) => commands.updateAttributes(type, { dir }))
            .some(Boolean),
    };
  },
});

/** An image with an optional caption: <figure><img><figcaption>. */
const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (element) => {
          const img = (element as HTMLElement).querySelector("img");
          return img
            ? {
                src: img.getAttribute("src") ?? "",
                alt: img.getAttribute("alt") ?? "",
                caption:
                  (element as HTMLElement).querySelector("figcaption")
                    ?.textContent ?? "",
              }
            : false;
        },
      },
    ];
  },
  renderHTML({ node }) {
    const img = [
      "img",
      { src: node.attrs.src, alt: node.attrs.alt, loading: "lazy" },
    ];
    return node.attrs.caption
      ? ["figure", {}, img, ["figcaption", {}, node.attrs.caption]]
      : ["figure", {}, img];
  },
  addCommands() {
    return {
      setFigure:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

/** Several images in a grid. */
const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element) =>
          Array.from(element.querySelectorAll("img"), (img) => ({
            src: img.getAttribute("src") ?? "",
            alt: img.getAttribute("alt") ?? "",
          })),
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div.rt-gallery" }];
  },
  renderHTML({ node }) {
    return [
      "div",
      { class: "rt-gallery" },
      ...(node.attrs.images as { src: string; alt: string }[]).map((image) => [
        "img",
        { src: image.src, alt: image.alt, loading: "lazy" },
      ]),
    ];
  },
  addCommands() {
    return {
      setGallery:
        (images) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { images } }),
    };
  },
});

/** A known embed (Vimeo, Instagram, Google Maps, Calendly, Typeform) in a frame; YouTube has its own node. */
const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  addAttributes() {
    return { preset: { default: "vimeo" }, src: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "div.rt-embed",
        getAttrs: (element) => ({
          preset: (element as HTMLElement).dataset.preset ?? "vimeo",
          src:
            (element as HTMLElement)
              .querySelector("iframe")
              ?.getAttribute("src") ?? "",
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const preset = (EMBED_PRESETS as readonly string[]).includes(
      node.attrs.preset,
    )
      ? (node.attrs.preset as EmbedPreset)
      : "vimeo";
    const src = embedSource(preset, node.attrs.src);
    return [
      "div",
      mergeAttributes({ class: "rt-embed", "data-preset": preset }),
      [
        "iframe",
        { src, loading: "lazy", allowfullscreen: "true", title: preset },
      ],
    ];
  },
  addCommands() {
    return {
      setEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export function richTextExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
      },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextDirection,
    Image.configure({ inline: false }),
    Figure,
    Gallery,
    Embed,
    Youtube.configure({
      nocookie: true,
      controls: true,
      width: 640,
      height: 360,
    }),
    TableKit.configure({ table: { resizable: false } }),
  ];
}
