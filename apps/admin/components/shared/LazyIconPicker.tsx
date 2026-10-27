"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
function LoadingIcons() {
  const { t } = useAdminLocale();
  return <p role="status">{t.copy.loadingIcons}</p>;
}
const Picker = dynamic(
  () => import("./IconPicker").then((module) => module.IconPicker),
  { ssr: false, loading: LoadingIcons },
);
export function IconPicker(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useAdminLocale();
  const [opened, setOpened] = useState(false);
  return opened ? (
    <Picker {...props} initialOpen />
  ) : (
    <button
      data-ui="text-field"
      type="button"
      onClick={() => setOpened(true)}
      aria-haspopup="dialog"
      aria-expanded={false}
      aria-label={
        props.value || props.placeholder
          ? `${t.iconPicker.selectIcon}: ${props.value || props.placeholder}`
          : t.lazyIconPicker.selectIcon
      }
      style={{ borderRadius: "var(--admin-field-radius)" }}
      className="flex w-full min-h-12 items-center justify-between gap-3 border border-outline bg-surface-raised px-3.5 py-2 text-sm text-ink hover:border-primary"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container"
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="truncate font-medium">
          {props.value || props.placeholder || t.lazyIconPicker.selectIcon}
        </span>
      </span>
      <ChevronDown aria-hidden className="h-4 w-4 text-ink-muted" />
    </button>
  );
}
