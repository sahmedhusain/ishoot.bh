"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  Archive,
  Blocks,
  CheckCircle2,
  Building2,
  Database,
  FastForward,
  Key,
  Terminal,
  ToggleRight,
  Globe,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Users,
} from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import { itAllowed } from "@platform/contracts";
import type {
  CompanyConfiguration,
  CompanyConfigurationPatch,
  SiteDomains,
} from "@platform/api-client";
import {
  saveCompanyAction,
  finishCompanySetupAction,
} from "../app/(desk)/company/actions";
import {
  setModuleAction,
  saveSiteDomainsAction,
} from "../app/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

type ModuleItem = {
  key: string;
  nameEn: string;
  nameAr: string;
  enabled: boolean;
};

export function SetupView({
  company,
  setupStatus,
  modules,
  domains,
  canEdit,
  canExecute,
  roles,
}: {
  company: CompanyConfiguration | null;
  setupStatus: { complete: boolean; missing: string[] } | null;
  modules: ModuleItem[];
  domains: SiteDomains | null;
  canEdit: boolean;
  canExecute: boolean;
  roles: string[];
}) {
  const { copy, locale } = useCopy();
  const s = copy.setupWizard;
  const router = useRouter();

  const [step, setStep] = React.useState<number>(1);
  const [busy, setBusy] = React.useState(false);

  // Form states
  const [nameEn, setNameEn] = React.useState(company?.companyNameEn ?? "");
  const [nameAr, setNameAr] = React.useState(company?.companyNameAr ?? "");
  const [cr, setCr] = React.useState(company?.crNumber ?? "");
  const [currency, setCurrency] = React.useState(company?.defaultCurrency ?? "");
  const [webDomain, setWebDomain] = React.useState(domains?.websiteDomain ?? "");
  const [adminDomain, setAdminDomain] = React.useState(domains?.adminDomain ?? "");
  const [moduleStates, setModuleStates] = React.useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const m of modules) map[m.key] = m.enabled;
    return map;
  });

  const saveStep1 = async () => {
    if (!nameEn.trim() || !nameAr.trim()) {
      toast.error(s.namesRequired);
      return false;
    }
    setBusy(true);
    try {
      const patch: CompanyConfigurationPatch = {
        companyNameEn: nameEn.trim(),
        companyNameAr: nameAr.trim(),
        crNumber: cr.trim() || undefined,
        defaultCurrency: currency.trim().toUpperCase(),
      };
      const res = await saveCompanyAction(patch);
      if (!res.ok) {
        toast.error(s.stepFailed);
        return false;
      }
      return true;
    } catch {
      toast.error(s.stepFailed);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveStep2 = async () => {
    setBusy(true);
    try {
      for (const m of modules) {
        const next = moduleStates[m.key];
        if (next !== undefined && next !== m.enabled) {
          const result = await setModuleAction(m.key, next);
          if (!result.ok) {
            toast.error(s.stepFailed);
            return false;
          }
        }
      }
      return true;
    } catch {
      toast.error(s.stepFailed);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveStep3 = async () => {
    if (webDomain.trim() && adminDomain.trim() && webDomain.trim() === adminDomain.trim()) {
      toast.error(s.domainsMustDiffer);
      return false;
    }
    setBusy(true);
    try {
      if (webDomain.trim() || adminDomain.trim()) {
        const res = await saveSiteDomainsAction(webDomain.trim(), adminDomain.trim());
        if (!res.ok) {
          toast.error(s.stepFailed);
          return false;
        }
      }
      return true;
    } catch {
      toast.error(s.stepFailed);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      if (await saveStep1()) setStep(2);
    } else if (step === 2) {
      if (await saveStep2()) setStep(3);
    } else if (step === 3) {
      if (await saveStep3()) setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const finishSetup = async () => {
    if (!canExecute) return;
    setBusy(true);
    try {
      const res = await finishCompanySetupAction();
      if (!res.ok) {
        toast.error(s.stepFailed);
        return;
      }
      toast.success(s.completed);
      router.push("/");
      router.refresh();
    } catch {
      toast.error(s.stepFailed);
    } finally {
      setBusy(false);
    }
  };

  const operationalLinks = [
    { href: "/integrations", label: "integrations", icon: Blocks, resource: "integrations" },
    { href: "/it-accounts", label: "itAccounts", icon: Users, resource: "it_accounts" },
    { href: "/system-health", label: "systemHealth", icon: Activity, resource: "system_health" },
    { href: "/logs", label: "logs", icon: Terminal, resource: "logs" },
    { href: "/database", label: "database", icon: Database, resource: "database" },
    { href: "/backups", label: "backups", icon: Archive, resource: "backups" },
    { href: "/api-keys", label: "apiKeys", icon: Key, resource: "api_keys" },
  ] as const;
  const visibleOperationalLinks = operationalLinks.filter(({ resource }) =>
    itAllowed(roles, resource, "read"),
  );

  return (
    <div className="it-setup mx-auto max-w-4xl space-y-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={s.title} description={s.description} />
        <Link
          href="/?skip=1"
          className="it-setup-skip inline-flex items-center gap-2 rounded border border-outline-variant px-3 py-2 text-sm font-medium text-ink hover:bg-surface-container"
        >
          <FastForward className="h-4 w-4" aria-hidden />
          <span>{s.skipToDashboard}</span>
        </Link>
      </div>

      <ol
        aria-label={s.stepsLabel}
        className="flex items-center justify-between overflow-x-auto border-b border-outline-variant pb-4"
      >
        {[
          { num: 1, label: s.steps.company, icon: Building2 },
          { num: 2, label: s.steps.modules, icon: ToggleRight },
          { num: 3, label: s.steps.domains, icon: Globe },
          { num: 4, label: s.steps.operations, icon: Blocks },
          { num: 5, label: s.steps.review, icon: CheckCircle2 },
        ].map(({ num, label, icon: Icon }) => (
          <li
            key={num}
            className={`flex shrink-0 items-center gap-2 text-sm font-medium ${
              step === num
                ? "text-primary"
                : step > num
                  ? "text-emerald-600"
                  : "text-ink-muted"
            }`}
            aria-current={step === num ? "step" : undefined}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                step === num
                  ? "bg-primary text-primary-contrast"
                  : step > num
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-surface-variant text-ink-muted"
              }`}
            >
              {step > num ? <Check className="h-4 w-4" /> : num}
            </div>
            <span className="hidden md:inline">{label}</span>
          </li>
        ))}
      </ol>

      {/* Step Content */}
      <Card className="it-setup-panel space-y-6 border border-outline-variant p-5 sm:p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">{s.step1Title}</h2>
            <p className="text-xs text-ink-muted">{s.step1Subtitle}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>{s.companyNameEn}</span>
                <Input
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{s.companyNameAr}</span>
                <Input
                  required
                  dir="rtl"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{s.crNumber}</span>
                <Input value={cr} onChange={(e) => setCr(e.target.value)} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{s.currency}</span>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">{s.step2Title}</h2>
            <p className="text-xs text-ink-muted">{s.step2Subtitle}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((m) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between rounded-2xl border border-outline-variant p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {locale === "ar" ? m.nameAr : m.nameEn}
                    </p>
                    <span className="text-xs text-ink-muted">{m.key}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={moduleStates[m.key] ?? m.enabled}
                    onChange={(e) =>
                      setModuleStates((prev) => ({
                        ...prev,
                        [m.key]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">{s.step3Title}</h2>
            <p className="text-xs text-ink-muted">{s.step3Subtitle}</p>
            <div className="space-y-4">
              <label className="block space-y-1 text-sm">
                <span>{s.websiteDomain}</span>
                <Input
                  dir="ltr"
                  placeholder={s.websiteDomainPlaceholder}
                  value={webDomain}
                  onChange={(e) => setWebDomain(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{s.adminDomain}</span>
                <Input
                  dir="ltr"
                  placeholder={s.adminDomainPlaceholder}
                  value={adminDomain}
                  onChange={(e) => setAdminDomain(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">{s.step4Title}</h2>
            <p className="text-xs text-ink-muted">{s.step4Subtitle}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleOperationalLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="it-setup-option flex items-center gap-3 rounded p-3 text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 font-medium">
                    {copy.nav[label]}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted rtl:rotate-180" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold">{s.step5Title}</h2>
            <div className="space-y-4 rounded-2xl bg-surface-variant p-4 text-sm">
              <div className="flex justify-between border-b border-outline-variant pb-2">
                <span className="text-ink-muted">{s.companyNameEn}:</span>
                <span className="font-medium">{nameEn}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant pb-2">
                <span className="text-ink-muted">{s.companyNameAr}:</span>
                <span className="font-medium">{nameAr}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant pb-2">
                <span className="text-ink-muted">{s.currency}:</span>
                <span className="font-medium">{currency}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant pb-2">
                <span className="text-ink-muted">{s.enabledModules}:</span>
                <span className="font-medium">
                  {modules.filter((m) => moduleStates[m.key] ?? m.enabled).length}
                  {" / "}
                  {modules.length}
                </span>
              </div>
              <div className="flex justify-between border-b border-outline-variant pb-2">
                <span className="text-ink-muted">{s.websiteDomain}:</span>
                <span className="font-medium">{webDomain || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">{s.adminDomain}:</span>
                <span className="font-medium">{adminDomain || "—"}</span>
              </div>
            </div>

            {setupStatus && !setupStatus.complete && setupStatus.missing.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                <p className="font-semibold">{s.missingNotice}:</p>
                <ul className="mt-1 list-disc list-inside">
                  {setupStatus.missing.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{s.back}</span>
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              type="button"
              disabled={busy || !canEdit}
              onClick={nextStep}
              className="flex items-center gap-1"
            >
              <span>{s.next}</span>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={busy || !canExecute}
              onClick={finishSetup}
              className="flex items-center gap-2"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>{s.completeSetup}</span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
