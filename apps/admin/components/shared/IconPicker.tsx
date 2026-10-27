"use client";

import * as React from "react";
import { Button, Input, Modal, SegmentedButton } from "@platform/ui";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import {
  ICON_PAGE_SIZE,
  PICKABLE_ICONS,
  POPULAR_ICON_NAMES,
} from "../../constants/icons";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  initialOpen?: boolean;
}
const ALL_ICON_NAMES = Object.keys(PICKABLE_ICONS);

export function IconPicker({
  value,
  onChange,
  placeholder,
  initialOpen = false,
}: IconPickerProps) {
  const { t } = useAdminLocale();
  const menuId = React.useId();
  const trigger = React.useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = React.useState(initialOpen);
  const [page, setPage] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"popular" | "all">("popular");
  const matches = React.useMemo(
    () =>
      search.trim()
        ? ALL_ICON_NAMES.filter((name) =>
            name.toLowerCase().includes(search.toLowerCase().trim()),
          )
        : tab === "popular"
          ? POPULAR_ICON_NAMES
          : ALL_ICON_NAMES,
    [search, tab],
  );
  const displayedIcons = matches.slice(
    page * ICON_PAGE_SIZE,
    (page + 1) * ICON_PAGE_SIZE,
  );
  React.useEffect(() => setPage(0), [search, tab]);
  const SelectedIcon = value ? (PICKABLE_ICONS[value] ?? null) : null;
  const close = () => {
    setIsOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };

  return (
    <div>
      <button
        data-ui="text-field"
        ref={trigger}
        style={{ borderRadius: "var(--admin-field-radius)" }}
        type="button"
        aria-label={
          value || placeholder
            ? `${t.iconPicker.selectIcon}: ${value || placeholder}`
            : t.copy.selectIcon
        }
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className="flex w-full min-h-12 items-center justify-between gap-3 rounded-xl border border-outline bg-surface-raised px-3.5 py-2 text-sm text-ink hover:border-primary"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container"
          >
            {SelectedIcon ? (
              <SelectedIcon className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </span>
          <span className="truncate font-medium">
            {value || placeholder || t.copy.selectIcon}
          </span>
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 text-ink-muted" />
      </button>
      <Modal
        id={menuId}
        kind="picker"
        isOpen={isOpen}
        onClose={close}
        title={t.iconPicker.selectIcon}
        className="max-w-lg"
        footer={
          <nav
            aria-label={t.iconPicker.iconResultPages}
            className="flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <span aria-live="polite" className="text-ink-muted">
              {matches.length} {t.iconPicker.icons} · {page + 1}/
              {Math.max(1, Math.ceil(matches.length / ICON_PAGE_SIZE))}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={page === 0}
                aria-label={t.iconPicker.previous}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft aria-hidden className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={(page + 1) * ICON_PAGE_SIZE >= matches.length}
                aria-label={t.iconPicker.next}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight
                  aria-hidden
                  className="h-4 w-4 rtl:-scale-x-100"
                />
              </Button>
              <Button type="button" variant="outline" onClick={close}>
                {t.actions.close}
              </Button>
            </div>
          </nav>
        }
      >
        <div className="space-y-5">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            />
            <Input
              type="text"
              aria-label={t.iconPicker.searchIcons}
              placeholder={t.iconPicker.searchIcons2}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-11"
            />
          </div>
          {!search && (
            <SegmentedButton
              label={t.iconPicker.selectIcon}
              value={tab}
              onChange={setTab}
              options={[
                { value: "popular", label: t.iconPicker.popular },
                { value: "all", label: t.iconPicker.allIcons },
              ]}
            />
          )}
          <div className="grid max-h-[40dvh] grid-cols-5 gap-2 overflow-y-auto p-1 sm:grid-cols-7">
            {displayedIcons.map((name) => {
              const Icon = PICKABLE_ICONS[name];
              return Icon ? (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={value === name}
                  onClick={() => {
                    onChange(name);
                    close();
                    setSearch("");
                  }}
                  className={`flex min-h-12 items-center justify-center rounded-xl border transition-colors ${value === name ? "border-primary bg-secondary-container text-on-secondary-container" : "border-transparent text-ink-muted hover:border-outline-variant hover:bg-surface-container"}`}
                >
                  <Icon aria-hidden className="h-5 w-5" />
                </button>
              ) : null;
            })}
          </div>
          {!displayedIcons.length && (
            <p className="py-6 text-center text-sm text-ink-muted">
              {t.iconPicker.noMatchingIconsFound}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
