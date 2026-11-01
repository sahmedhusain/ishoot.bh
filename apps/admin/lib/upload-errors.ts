import { serverTemplates, formatMessage } from "@platform/locales";

/** "Maximum file size: N MB", from the limit the files service reports with a payload_too_large error. */
export function tooLargeMessage(maxFileSize: unknown) {
  const megabytes = Math.floor(Number(maxFileSize) / (1024 * 1024));
  return formatMessage(serverTemplates.maximumFileSize, {
    0: megabytes > 0 ? megabytes : "",
  });
}
