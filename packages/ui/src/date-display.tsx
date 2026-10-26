
export interface DateDisplayProps {
  date: string | Date | null | undefined;
  locale?: string;
  format?: "short" | "long" | "numeric" | "time";
  className?: string;
}

export function formatDate(
  date: string | Date | null | undefined,
  locale: string = "ar",
  format: "short" | "long" | "numeric" | "time" = "short",
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  if (format === "numeric") {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const localeTag = locale === "ar" ? "ar-BH-u-nu-latn" : "en-GB";

  const options: Intl.DateTimeFormatOptions =
    format === "long"
      ? { day: "numeric", month: "long", year: "numeric" }
      : format === "time"
        ? {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
        : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat(localeTag, options).format(d);
}

export function DateDisplay({
  date,
  locale = "ar",
  format = "short",
  className = "",
}: DateDisplayProps) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {formatDate(date, locale, format)}
    </span>
  );
}
