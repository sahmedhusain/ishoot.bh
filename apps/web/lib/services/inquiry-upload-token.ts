import { createHmac, timingSafeEqual } from "node:crypto";

export function inquiryUploadToken(
  id: string,
  secret: string,
  expires = Date.now() + 10 * 60_000,
) {
  const payload = `${id}.${expires}`;
  return `${payload}.${createHmac("sha256", secret).update(`inquiry-upload:${payload}`).digest("hex")}`;
}
export function inquiryFromUploadToken(
  value: string,
  secret: string,
  now = Date.now(),
) {
  const [id, expires, signature, extra] = value.split(".");
  if (
    extra ||
    !/^[a-z0-9-]{1,60}$/.test(id ?? "") ||
    !/^\d{13}$/.test(expires ?? "") ||
    Number(expires) <= now ||
    Number(expires) > now + 10 * 60_000 ||
    !/^[a-f0-9]{64}$/.test(signature ?? "")
  )
    return null;
  const expected = createHmac("sha256", secret)
    .update(`inquiry-upload:${id}.${expires}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ? id
    : null;
}
