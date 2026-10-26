import { expect, test } from "vitest";
import { validateActionArguments } from "../../apps/admin/lib/action-input";

const input = (values: Record<string, unknown>) => ({
  provider: "youtube",
  isActive: false,
  values,
  config: {},
});
test("external credential IDs allow optional blanks and opaque values before provider validation", () => {
  expect(() =>
    validateActionArguments(
      "saveIntegration",
      input({
        clientId: "",
        channelId: "",
        accountId: "x".repeat(2000),
        ownerAccessToken: "a".repeat(4096),
      }),
    ),
  ).not.toThrow();
});
test.each([
  null,
  [],
  { clientId: 3 },
  { clientId: "a\0b" },
  { clientId: "x".repeat(20001) },
  JSON.parse('{"__proto__":"bad"}'),
])(
  "integration credential records retain structural and string protection: %j",
  (values) => {
    expect(() =>
      validateActionArguments("saveIntegration", { ...input({}), values }),
    ).toThrow();
  },
);
test("other record and ID semantics are unchanged", () => {
  expect(() =>
    validateActionArguments("deleteCmsArticleAction", { id: "" }),
  ).toThrow();
  expect(() =>
    validateActionArguments("deleteCmsArticleAction", { id: "a".repeat(151) }),
  ).toThrow();
  expect(() =>
    validateActionArguments("saveIntegration", {
      ...input({}),
      config: { accountId: "" },
    }),
  ).toThrow();
});

test.each([
  { fromEmail: "invalid" },
  { fromEmail: "a".repeat(250) + "@example.test" },
  { callbackUrl: "javascript:alert(1)" },
])("non-ID credential semantics still apply: %j", (values) => {
  expect(() =>
    validateActionArguments("saveIntegration", input(values)),
  ).toThrow();
});
