"use client";
import { Select, PhoneInput } from "@platform/ui";
import { InquiryAttachments } from "./InquiryAttachments";
import { formatMessage, getUiTranslations } from "@platform/locales";
import { isValidPhone } from "@platform/config/phone";
import * as React from "react";
import { ArrowUpRight, Check, Star } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import type { PublicService } from "@platform/database/website-config";
import { getCurrencyLabel } from "@platform/config/currency";

const publicField =
  "w-full px-4 py-3 rounded-brand bg-m3-surface-container-low border border-m3-outline-variant text-m3-on-surface text-sm placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary transition-colors duration-150 font-sans";

const intents = [
  "inquiry",
  "quote_request",
  "complaint",
  "suggestion",
  "review",
] as const;
type Intent = (typeof intents)[number];
export function ContactForm({
  services = [],
  initialIntent = "inquiry",
  initialService = "",
  initialMessage = "",
  response = "",
}: {
  services?: PublicService[];
  initialIntent?: string;
  initialService?: string;
  initialMessage?: string;
  response?: string;
}) {
  const { t, locale, isArabic: ar, site } = useTranslation();
  const ask = site?.inquiry ?? { budget: true, timeline: true, location: true, reference: false };
  const currency = getCurrencyLabel(site?.currency ?? "", ar, false);
  const [intent, setIntent] = React.useState<Intent>(
    intents.includes(initialIntent as Intent)
      ? (initialIntent as Intent)
      : "inquiry",
  );
  const [selected, setSelected] = React.useState<string[]>(
    services.some((s) => s.id === initialService) ? [initialService] : [],
  );
  const [rating, setRating] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState<{
    reference?: string;
    uploadToken?: string;
    confirmationSent?: boolean;
  } | null>(null);
  const submission = React.useRef({ payload: "", key: "" });
  const formRef = React.useRef<HTMLFormElement>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const labels = [
    t("contact.intents.inquiry"),
    t("contact.intents.quoteRequest"),
    t("contact.intents.complaint"),
    t("contact.intents.suggestion"),
    t("contact.intents.review"),
  ];
  const descriptions = [
    t("contact.intents.inquiryDesc"),
    t("contact.intents.quoteRequestDesc"),
    t("contact.intents.complaintDesc"),
    t("contact.intents.suggestionDesc"),
    t("contact.intents.reviewDesc"),
  ];

  const sales = intent === "inquiry" || intent === "quote_request";
  const field = publicField;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const read = (key: string) => String(form.get(key) || "").trim();

    const emailValue = read("email");
    const phoneValue = read("phone");
    const uiCopy = getUiTranslations(locale);

    if (
      intent !== "review" &&
      intent !== "suggestion" &&
      !emailValue &&
      !phoneValue
    ) {
      setError(t("contact.validationEmailOrPhone"));
      formRef.current
        ?.querySelector<HTMLInputElement>('[name="email"]')
        ?.focus();
      return;
    }
    if (intent !== "review" && emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue)) {
      setError(uiCopy.invalidEmail);
      formRef.current
        ?.querySelector<HTMLInputElement>('[name="email"]')
        ?.focus();
      return;
    }
    if (intent !== "review" && phoneValue && !isValidPhone(phoneValue)) {
      setError(uiCopy.invalidPhone);
      return;
    }
    if (intent === "review" && !rating) {
      setError(t("contact.validationRating", { min: 1, max: 5 }));
      return;
    }

    const body =
      intent === "review"
        ? {
          authorName: read("fullName"),
          companyName: read("company"),
          rating,
          quote: read("message"),
          locale,
          website: read("website"),
        }
        : {
          fullName: read("fullName"),
          email: read("email"),
          phone: read("phone"),
          company: read("company"),
          message: read("message"),
          services: sales ? selected : [],
          budget: read("budget"),
          timeline: read("timeline"),
          projectReference: read("projectReference"),
          location: read("location"),
          intent,
          locale,
          website: read("website"),
        };

    const payload = JSON.stringify(body);
    if (submission.current.payload !== payload)
      submission.current = { payload, key: crypto.randomUUID() };
    setBusy(true);

    try {
      const res = await fetch(
        intent === "review" ? "/api/reviews" : "/api/inquiry",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            submissionKey: submission.current.key,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(
          res.status === 429
            ? t("contact.rateLimit")
            : t("contact.submissionFailed"),
        );
      setSuccess(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("contact.connectionFailed"));
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    if (success) resultRef.current?.focus();
  }, [success]);

  if (success)
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        className="py-10 space-y-6 text-center select-none"
        role="status"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-m3-primary border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white">
          {t("contact.messageReceived")}
        </h2>
        <p className="text-ink-muted font-sans max-w-lg mx-auto text-sm leading-relaxed">
          {intent === "review"
            ? t("contact.reviewSubmittedNotice")
            : response || t("contact.successMessage")}
        </p>
        {success.reference && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-w-xs mx-auto text-xs font-sans">
            <span className="text-ink-muted block mb-1">
              {t("contact.referenceNumber")}
            </span>
            <strong
              className="select-all font-mono text-sm text-mint"
              dir="ltr"
            >
              {success.reference}
            </strong>
          </div>
        )}
        {intent !== "review" && !success.confirmationSent && (
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {t("contact.savedNotice")}
          </p>
        )}
        {success.uploadToken && <InquiryAttachments token={success.uploadToken} locale={locale} />}
        <button
          type="button"
          className="px-6 py-3 rounded-xl bg-m3-primary hover:brightness-95 text-m3-on-primary font-semibold text-xs transition-colors duration-150 shadow-lg shadow-accent/20 cursor-pointer"
          onClick={() => {
            setSuccess(null);
            submission.current = { payload: "", key: "" };
            setRating(0);
            setSelected([]);
          }}
        >
          {t("contact.sendAnother")}
        </button>
      </div>
    );

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="space-y-8"
      aria-busy={busy}
    >
      <fieldset disabled={busy} className="space-y-4">
        <legend className="text-xl font-bold text-white font-display mb-4 block">
          {t("contact.intents.title")}
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {intents.map((value, index) => {
            const isSelected = intent === value;
            return (
              <label
                key={value}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer flex items-center gap-2 ${isSelected
                  ? "bg-accent text-accent-foreground border border-accent"
                  : "bg-brand-base text-ink-muted hover:text-white border border-white/10 hover:border-white/20"
                  }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="intent"
                  value={value}
                  checked={isSelected}
                  onChange={() => {
                    setIntent(value);
                    setError("");
                  }}
                />
                <span>{labels[index]}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs sm:text-sm text-ink-muted font-sans leading-relaxed pt-1">
          {descriptions[intents.indexOf(intent)]}
        </p>
      </fieldset>

      <fieldset
        disabled={busy}
        className="space-y-6 pt-4 border-t border-white/10"
      >
        <legend className="sr-only">{t("contact.messageDetails")}</legend>

        <div className="grid sm:grid-cols-2 gap-5">
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-ink font-sans">
              {intent === "review"
                ? t("contact.displayName")
                : t("contact.fullName")}
              {intent !== "suggestion" && " *"}
            </span>
            <input
              name="fullName"
              autoComplete="name"
              required={intent !== "suggestion"}
              maxLength={200}
              placeholder={t("contact.fullNamePlaceholder")}
              className={field}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold text-ink-muted font-sans">
              {t("contact.companyOptional")}
            </span>
            <input
              name="company"
              autoComplete="organization"
              maxLength={200}
              placeholder={t("contact.companyPlaceholder")}
              className={field}
            />
          </label>
        </div>

        {intent !== "review" && (
          <div className="grid sm:grid-cols-2 gap-5">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-ink font-sans">
                {t("contact.email")}
              </span>
              <input
                name="email"
                autoComplete="email"
                type="email"
                maxLength={254}
                dir="ltr"
                placeholder={t("contact.emailPlaceholder")}
                className={field}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold text-ink font-sans">
                {t("contact.phone")}
              </span>
              <PhoneInput
                id="contact-phone"
                name="phone"
                autoComplete="tel"
              />
            </label>
          </div>
        )}

        {sales && services.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-ink font-sans">
              {t("contact.servicesInterested")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => {
                const isChecked = selected.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className={`min-h-11 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1.5 ${isChecked
                      ? "bg-m3-secondary-container text-m3-on-secondary-container border border-m3-primary"
                      : "bg-m3-surface-container-lowest text-m3-on-surface border border-m3-outline"
                      }`}
                  >
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setSelected((values) =>
                          e.target.checked
                            ? [...values, service.id]
                            : values.filter((id) => id !== service.id),
                        )
                      }
                    />
                    <span>{ar ? service.nameAr : service.nameEn}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {intent === "quote_request" && (ask.budget || ask.timeline || ask.location || ask.reference) && (
          <div className="grid sm:grid-cols-2 gap-5">
            {ask.budget && (
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-ink font-sans">
                  {t("contact.estimatedBudget")}
                </span>
                <Select className={field} name="budget" defaultValue="">
                  <option value="">
                    {t("contact.chooseRangeOptional")}
                  </option>
                  <option value="not_sure">
                    {t("contact.budgetNotSure")}
                  </option>
                  <option value="under_500">
                    {t("contact.budgetUnder500", { currency })}
                  </option>
                  <option value="500_1500">
                    {t("contact.budget500_1500", { currency })}
                  </option>
                  <option value="1500_5000">
                    {t("contact.budget1500_5000", { currency })}
                  </option>
                  <option value="5000_plus">
                    {t("contact.budget5000Plus", { currency })}
                  </option>
                </Select>
              </label>
            )}

            {ask.timeline && (
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-ink font-sans">
                  {t("contact.targetTimeline")}
                </span>
                <Select className={field} name="timeline" defaultValue="">
                  <option value="">
                    {t("contact.chooseTimelineOptional")}
                  </option>
                  <option value="urgent">
                    {t("contact.timelineUrgent", { weeks: 2 })}
                  </option>
                  <option value="month">
                    {t("contact.timelineMonth")}
                  </option>
                  <option value="quarter">
                    {t("contact.timelineQuarter", { min: 1, max: 3 })}
                  </option>
                  <option value="flexible">
                    {t("contact.timelineFlexible")}
                  </option>
                </Select>
              </label>
            )}

            {ask.location && (
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-xs font-semibold text-ink-muted font-sans">
                  {t("contact.location") || t("contact.shootLocation")}
                </span>
                <input
                  name="location"
                  maxLength={300}
                  placeholder={t("contact.locationPlaceholder") || t("contact.shootLocationPlaceholder")}
                  className={field}
                />
              </label>
            )}

            {ask.reference && (
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-xs font-semibold text-ink-muted font-sans">
                  {t("contact.projectRefLabel")}
                </span>
                <input
                  name="projectReference"
                  maxLength={200}
                  placeholder={t("contact.projectRefPlaceholder")}
                  className={field}
                />
              </label>
            )}
          </div>
        )}

        {intent === "complaint" && (
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-ink-muted font-sans">
              {t("contact.projectRefLabel")}
            </span>
            <input
              name="projectReference"
              maxLength={200}
              placeholder={t("contact.projectRefPlaceholder")}
              className={field}
            />
          </label>
        )}

        {intent === "review" && (
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-ink font-sans">
              {t("contact.starRatingLabel", { min: 1, max: 5 })} *
            </legend>
            <div className="flex gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 w-fit">
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  className="cursor-pointer min-w-11 min-h-11 flex items-center justify-center transition-transform motion-safe:hover:scale-110"
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="rating"
                    value={value}
                    aria-label={formatMessage(t("contact.ratingOption"), { value: String(value) })}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    required
                  />
                  <Star
                    aria-hidden
                    className={`w-7 h-7 transition-colors ${rating >= value
                      ? "text-amber-400 fill-amber-400"
                      : "text-neutral-600"
                      }`}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label className="block space-y-2">
          <span className="text-xs font-semibold text-ink font-sans">
            {intent === "review"
              ? t("contact.reviewQuoteLabel")
              : t("contact.yourMessage")}{" "}
            *
          </span>
          <textarea
            name="message"
            required
            maxLength={intent === "review" ? 5000 : 10000}
            rows={5}
            defaultValue={initialMessage}
            placeholder={t("contact.messagePlaceholder")}
            className={`${field} resize-none`}
          />
        </label>

        <div className="hidden" aria-hidden="true">
          <label>
            {t("common.website")}
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {error && (
          <div
            id="contact-error"
            role="alert"
            className="p-4 rounded-xl bg-m3-error-container text-m3-on-error-container border border-m3-error/30 text-xs font-sans"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-5 sm:items-center justify-between pt-2">
          <p className="text-xs leading-relaxed text-ink-muted font-sans max-w-sm">
            {intent === "review"
              ? t("contact.reviewSubmittedNotice")
              : response || t("contact.formNote")}
          </p>

          <button
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-m3-primary hover:brightness-95 text-m3-on-primary font-bold text-xs sm:text-sm transition-colors duration-150 disabled:opacity-50 cursor-pointer"
            type="submit"
          >
            <span>
              {busy
                ? t("contact.submitting")
                : intent === "review"
                  ? t("contact.submitReview")
                  : t("contact.submitInquiry")}
            </span>
            <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </div>
      </fieldset>
    </form>
  );
}
