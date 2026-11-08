import { serverMessages } from "@platform/locales";
import { safeWebsiteUrl } from "../website-config";

export interface WebsitePromotion {
  titleEn: string;
  titleAr: string;
  textEn: string;
  textAr: string;
  labelEn: string;
  labelAr: string;
  url: string;
  imageUrl: string;
  placement: "home" | "catalogue" | "both";
  category: string;
  couponCode: string;
  startsAt: string;
  endsAt: string;
}
export function validateWebsitePromotions(value: unknown): WebsitePromotion[] {
  if (!Array.isArray(value) || value.length > 30)
    throw new Error(serverMessages.invalidInput);
  return value.map((raw) => {
    if (!raw || typeof raw !== "object")
      throw new Error(serverMessages.invalidInput);
    const text = (key: string, max: number) => {
      if (typeof raw[key] !== "string" || raw[key].length > max)
        throw new Error(serverMessages.invalidInput);
      return raw[key].trim();
    };
    const promo: WebsitePromotion = {
      titleEn: text("titleEn", 200),
      titleAr: text("titleAr", 200),
      textEn: text("textEn", 1000),
      textAr: text("textAr", 1000),
      labelEn: text("labelEn", 100),
      labelAr: text("labelAr", 100),
      url: text("url", 2000),
      imageUrl: text("imageUrl", 2000),
      placement: raw.placement,
      category: text("category", 80),
      couponCode: text("couponCode", 30).toUpperCase(),
      startsAt: text("startsAt", 40),
      endsAt: text("endsAt", 40),
    };
    if (
      !promo.titleEn ||
      !promo.titleAr ||
      !["home", "catalogue", "both"].includes(promo.placement) ||
      (promo.url && !safeWebsiteUrl(promo.url)) ||
      (promo.imageUrl && !safeWebsiteUrl(promo.imageUrl)) ||
      (promo.category && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(promo.category)) ||
      (promo.couponCode && !/^[A-Z0-9-]{3,30}$/.test(promo.couponCode)) ||
      [promo.startsAt, promo.endsAt].some(
        (date) =>
          date &&
          (!/^\d{4}-\d{2}-\d{2}T/.test(date) ||
            !Number.isFinite(Date.parse(date))),
      ) ||
      (promo.startsAt &&
        promo.endsAt &&
        Date.parse(promo.endsAt) <= Date.parse(promo.startsAt))
    )
      throw new Error(serverMessages.invalidInput);
    return promo;
  });
}
export function promotionVisible(
  promo: WebsitePromotion,
  placement: "home" | "catalogue",
  category: string,
  now = Date.now(),
) {
  return (
    (promo.placement === "both" || promo.placement === placement) &&
    (!promo.category || promo.category === category) &&
    (!promo.startsAt || Date.parse(promo.startsAt) <= now) &&
    (!promo.endsAt || Date.parse(promo.endsAt) > now)
  );
}
