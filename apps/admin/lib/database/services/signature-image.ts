import { serverMessages } from "@platform/locales";
const MAX_SIGNATURE_BYTES = 200 * 1024;

/** A drawn signature must be a real, reasonably small PNG data URL. Returns its bytes. */
export function validateSignatureImage(dataUrl: string) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl ?? "",
  );
  if (!match) throw new Error(serverMessages.drawYourSignatureToContinue);
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length < 200)
    throw new Error(serverMessages.drawYourSignatureToContinue);
  if (bytes.length > MAX_SIGNATURE_BYTES)
    throw new Error(serverMessages.theSignatureImageIsTooLarge);
  if (
    !bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    throw new Error(serverMessages.drawYourSignatureToContinue);
  return bytes;
}
