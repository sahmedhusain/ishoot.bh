import { describe, expect, it } from "vitest";
import { submissionKey, textField } from "../../lib/submissions";

describe("Web Intake Form Submissions Suite", () => {
  it("validates text fields and trims whitespace", () => {
    const body = { name: "  Alice Smith  ", notes: "Hello World" };
    expect(textField(body, "name", 100, true)).toBe("Alice Smith");
    expect(textField(body, "notes", 100)).toBe("Hello World");
  });

  it("throws error on missing required text fields or max length violation", () => {
    const body = { name: "   ", longText: "a".repeat(101) };
    expect(() => textField(body, "name", 100, true)).toThrow();
    expect(() => textField(body, "longText", 100)).toThrow();
  });

  it("validates submission keys syntax", () => {
    const validBody = { submissionKey: "valid-submission-key-1234567890" };
    expect(submissionKey(validBody)).toBe("valid-submission-key-1234567890");

    const invalidBody = { submissionKey: "short" };
    expect(() => submissionKey(invalidBody)).toThrow();
  });
});
