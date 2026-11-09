import { describe, expect, it } from "vitest";
import { sanitizeRichHtml } from "../../lib/rich-text/sanitize";

describe("sanitizeRichHtml", () => {
  it("removes scripts, event handlers, and unsafe URL schemes", () => {
    const result = sanitizeRichHtml(
      '<p onclick="alert(1)">Text</p><script>alert(1)</script><a href="javascript:alert(1)">link</a><img src="x" onerror="alert(1)">',
    );

    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("<p>Text</p>");
  });

  it("preserves safe formatting and approved embeds only", () => {
    const result = sanitizeRichHtml(
      '<p style="text-align:center;color:red"><strong>Safe</strong><iframe src="https://www.youtube-nocookie.com/embed/video" title="Video"></iframe><iframe src="https://attacker.example/embed/video"></iframe></p>',
    );

    expect(result).toContain('<p style="text-align:center">');
    expect(result).toContain("<strong>Safe</strong>");
    expect(result).toContain("youtube-nocookie.com/embed/video");
    expect(result).not.toContain("attacker.example");
    expect(result).not.toContain("color:red");
  });
});
