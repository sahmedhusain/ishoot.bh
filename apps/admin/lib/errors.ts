import { serverMessages } from "@platform/locales";

// Next preserves digests when production hides server error text; only a public message key crosses it.
export const publicError = (key: keyof typeof serverMessages) =>
  Object.assign(new Error(serverMessages[key]), { digest: `platform:${key}` });
