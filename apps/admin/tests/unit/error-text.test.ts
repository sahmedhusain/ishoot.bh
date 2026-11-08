import { expect, it } from "vitest";
import { errorMessage } from "../../lib/error-text";
import { adminTranslations } from "../../lib/translations-bilingual";
import { publicError } from "../../lib/errors";

it.each(["en", "ar"] as const)(
  "localizes public stock refusals after production masks their text (%s)",
  (locale) => {
    const error = Object.assign(
      new Error("An error occurred in the Server Components render"),
      { digest: publicError("stockInsufficient").digest },
    );
    expect(errorMessage(error, adminTranslations[locale])).toBe(
      adminTranslations[locale].serverErrors.messages.stockInsufficient,
    );
  },
);

it("does not render arbitrary or inherited error digests", () => {
  for (const digest of [
    "platform:constructor",
    "platform:__proto__",
    "platform:private-detail",
    "internal-detail",
  ]) {
    const error = Object.assign(new Error("Server error"), { digest });
    expect(errorMessage(error, adminTranslations.ar)).toBe(
      adminTranslations.ar.serverErrors.generic,
    );
  }
});
