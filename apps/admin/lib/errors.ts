import { serverMessages } from "@platform/locales";

export const publicError = (key: keyof typeof serverMessages) =>
  Object.assign(new Error(serverMessages[key]), { digest: `platform:${key}` });
