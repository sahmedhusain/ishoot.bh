import { describe, expect, test } from "vitest";
import { getAdminTranslations } from "../../../admin/locales";
import {
  BLOCK_TYPES,
  embedSource,
  newBlockData,
  videoSource,
} from "@platform/database/cms/blocks";
import { validateBlocks } from "@platform/database/queries/cms-pages";

describe("website page blocks", () => {
  test("every block type has a name in both languages and starting data", () => {
    for (const locale of ["en", "ar"] as const) {
      const names = getAdminTranslations(locale).cmsPages.types as Record<
        string,
        string
      >;
      for (const type of BLOCK_TYPES)
        expect(names[type], `${locale} ${type}`).toBeTruthy();
    }
    for (const type of BLOCK_TYPES)
      expect(newBlockData(type)).toBeTypeOf("object");
  });

  test("embeds only load their provider over https", () => {
    expect(embedSource("youtube", "https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(
      embedSource("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedSource("vimeo", "https://vimeo.com/123456")).toBe(
      "https://player.vimeo.com/video/123456",
    );
    expect(embedSource("instagram", "https://www.instagram.com/p/AbC_1/")).toBe(
      "https://www.instagram.com/p/AbC_1/embed",
    );
    expect(
      embedSource("google_maps", "https://www.google.com/maps/embed?pb=1"),
    ).toBe("https://www.google.com/maps/embed?pb=1");
    expect(
      embedSource("google_maps", "https://www.google.com/search?q=x"),
    ).toBe("");
    expect(embedSource("youtube", "http://youtu.be/dQw4w9WgXcQ")).toBe("");
    expect(embedSource("calendly", "https://evil.example/calendly.com")).toBe(
      "",
    );
    expect(embedSource("typeform", "javascript:alert(1)")).toBe("");
    expect(videoSource("https://cdn.example.com/a.mp4")).toEqual({
      kind: "file",
      src: "https://cdn.example.com/a.mp4",
    });
    expect(videoSource("https://example.com/page")).toBeNull();
  });

  test("blocks are cleaned to their type's shape", () => {
    const [cta, code] = validateBlocks([
      {
        id: "a1",
        type: "cta",
        visible: true,
        data: {
          title: { en: "Go", ar: "هيا", extra: 1 },
          buttonUrl: "javascript:alert(1)",
          rogue: "x",
        },
      },
      {
        id: "a1",
        type: "code",
        data: { html: "<b>x</b>", js: "1", height: 99999 },
      },
    ]);
    expect(cta.data).toEqual({
      title: { en: "Go", ar: "هيا" },
      text: { en: "", ar: "" },
      buttonLabel: { en: "", ar: "" },
      buttonUrl: "",
    });
    expect(code.id).not.toBe("a1");
    expect((code.data as { height: number }).height).toBe(4000);
    expect(() => validateBlocks([{ type: "script" }])).toThrow();
  });
});
