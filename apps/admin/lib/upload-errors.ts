import { serverTemplates, formatMessage } from "@platform/locales";

export function tooLargeMessage(maxFileSize: unknown) {
  const megabytes = Math.floor(Number(maxFileSize) / (1024 * 1024));
  return formatMessage(serverTemplates.maximumFileSize, {
    0: megabytes > 0 ? megabytes : "",
  });
}
