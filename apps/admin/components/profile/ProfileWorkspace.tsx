"use client";
import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { PageHeader } from "../layout/PageHeader";

type ProfileSectionId = "details" | "signature" | "assets" | "security";

export function ProfileWorkspace({
  hasEmployee,
  children,
}: {
  hasEmployee: boolean;
  children: React.ReactNode;
}) {
  const { t } = useAdminLocale();
  const p = t.profileWorkspace;
  const containerRef = React.useRef<HTMLDivElement>(null);

  const sections = React.useMemo(
    () =>
      (
        [
          ["details", p.details],
          ["signature", p.signature],
          ...(hasEmployee ? [["assets", t.assets.navTitle] as const] : []),
          ["security", t.profileSecurity.title],
        ] as [ProfileSectionId, string][]
      ),
    [p.details, p.signature, hasEmployee, t.assets.navTitle, t.profileSecurity.title],
  );

  const [active, setActive] = React.useState<ProfileSectionId>("details");

  React.useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "") as ProfileSectionId;
      if (sections.some(([id]) => id === hash)) {
        setActive(hash);
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [sections]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const panels = container.querySelectorAll<HTMLElement>("[data-profile-tab]");
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.profileTab !== active;
    });
  }, [active]);

  const handleSelect = (id: ProfileSectionId) => {
    setActive(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <div ref={containerRef} className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader />
      <div
        role="tablist"
        data-tab-variant="pills"
        aria-label={t.sidebar.myProfile}
        className="flex flex-wrap gap-2 border-b border-outline-variant pb-3"
      >
        {sections.map(([id, label]) => {
          const isSelected = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleSelect(id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? "bg-secondary-container text-on-secondary-container shadow-xs"
                  : "text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
