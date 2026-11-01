"use client";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { PageHeader } from "../layout/PageHeader";
export function ProfileWorkspace({
  hasEmployee,
  children,
}: {
  hasEmployee: boolean;
  children: React.ReactNode;
}) {
  const { t } = useAdminLocale();
  const p = t.profileWorkspace;
  const sections = [
    ["details", p.details],
    ["signature", p.signature],
    ...(hasEmployee ? [["assets", t.assets.navTitle]] : []),
    ["security", t.profileSecurity.title],
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader />
      <nav
        aria-label={t.sidebar.myProfile}
        className="flex flex-wrap gap-2 border-b border-outline-variant pb-4"
      >
        {sections.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-lg bg-ink/5 px-4 py-2 text-sm font-medium text-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {label}
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
}
