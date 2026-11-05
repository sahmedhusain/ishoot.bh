import { describe, expect, it } from "vitest";
import { renderRichText } from "../../lib/rich-text/render";

describe("renderRichText", () => {
  it("uses localized accessible titles for embedded videos", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "youtube",
          attrs: { src: "https://youtu.be/abc123xyz00" },
        },
      ],
    };

    expect(renderRichText(document, "en")).toContain(
      'src="https://www.youtube-nocookie.com/embed/abc123xyz00" title="Video"',
    );
    expect(renderRichText(document, "ar")).toContain(
      'src="https://www.youtube-nocookie.com/embed/abc123xyz00" title="فيديو"',
    );
  });
});
