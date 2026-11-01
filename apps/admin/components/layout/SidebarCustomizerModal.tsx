"use client";

import * as React from "react";
import { Button, Modal, SegmentedButton, Select } from "@platform/ui";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  FolderKanban,
  Layers,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  DEPARTMENT_SIDEBAR_PRIORITIES,
  SIDEBAR_PRESETS,
  defaultSidebarCustomization,
  sidebarGroupOrder,
  type DesignationTier,
  type SidebarCustomizationConfig,
  type SidebarPresetId,
} from "../../lib/sidebar-navigation";

export interface CustomizerSectionItem {
  id: string;
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

interface SidebarCustomizerModalProps {
  open: boolean;
  onClose: () => void;
  role?: string;
  sections: CustomizerSectionItem[];
  config: SidebarCustomizationConfig;
  onSave: (next: SidebarCustomizationConfig) => void;
}

const PRESET_IDS: SidebarPresetId[] = [
  "role_default",
  "executive_suite",
  "finance_desk",
  "hr_people_desk",
  "sales_crm_desk",
  "supply_inventory",
  "logistics_fleet",
  "marketing_digital",
  "legal_governance",
  "minimal_essential",
];

const DESIGNATION_TIERS: DesignationTier[] = [
  "executive_director",
  "department_head",
  "team_lead",
  "specialist_officer",
  "field_operations",
  "support_coordinator",
];

const DEPARTMENT_KEYS = Object.keys(DEPARTMENT_SIDEBAR_PRIORITIES);

export function SidebarCustomizerModal({
  open,
  onClose,
  role,
  sections,
  config,
  onSave,
}: SidebarCustomizerModalProps) {
  const { t } = useAdminLocale();
  const copy = t.sidebarCustomizer;

  const [tab, setTab] = React.useState<"presets" | "sections" | "pinned">("presets");
  const [draft, setDraft] = React.useState<SidebarCustomizationConfig>(config);

  React.useEffect(() => {
    if (open) {
      setDraft(config);
    }
  }, [open, config]);

  const permittedHrefs = React.useMemo(
    () => new Set(sections.flatMap((s) => s.items.map((i) => i.href))),
    [sections],
  );

  const applyNamedPreset = (presetId: SidebarPresetId) => {
    if (presetId === "role_default") {
      const nextOrder = sidebarGroupOrder(role, draft.departmentKey, draft.designationTier);
      setDraft({
        ...draft,
        presetId: "role_default",
        sectionOrder: nextOrder,
        hiddenSections: [],
      });
      return;
    }
    const preset = SIDEBAR_PRESETS[presetId];
    const nextOrder = sidebarGroupOrder(role, draft.departmentKey, draft.designationTier, preset.order);
    const nextPinned = (preset.defaultPinned ?? []).filter((href) => permittedHrefs.has(href));
    setDraft({
      ...draft,
      presetId,
      sectionOrder: nextOrder,
      hiddenSections: (preset.hidden ?? []).filter((id) => id !== "workspace"),
      pinnedHrefs: nextPinned.length > 0 ? nextPinned : draft.pinnedHrefs,
    });
  };

  const handleDepartmentChange = (deptKey: string) => {
    const nextDept = deptKey || undefined;
    const nextOrder = sidebarGroupOrder(role, nextDept, draft.designationTier);
    setDraft((prev) => ({
      ...prev,
      departmentKey: nextDept,
      sectionOrder: nextOrder,
    }));
  };

  const handleDesignationChange = (tier: string) => {
    const nextTier = (tier || undefined) as DesignationTier | undefined;
    const nextOrder = sidebarGroupOrder(role, draft.departmentKey, nextTier);
    setDraft((prev) => ({
      ...prev,
      designationTier: nextTier,
      sectionOrder: nextOrder,
    }));
  };

  const orderedSections = React.useMemo(() => {
    const order = draft.sectionOrder;
    return [...sections].sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [sections, draft.sectionOrder]);

  const moveSection = (sectionId: string, delta: -1 | 1) => {
    const ids = orderedSections.map((s) => s.id);
    const idx = ids.indexOf(sectionId);
    const targetIdx = idx + delta;
    if (idx < 0 || targetIdx < 0 || targetIdx >= ids.length) return;
    // Keep workspace at top if user tries to move above index 0, or allow full reorder
    const nextVisibleIds = [...ids];
    const [moved] = nextVisibleIds.splice(idx, 1);
    nextVisibleIds.splice(targetIdx, 0, moved);
    const fullOrder = Array.from(new Set([...nextVisibleIds, ...draft.sectionOrder]));
    setDraft((prev) => ({ ...prev, sectionOrder: fullOrder }));
  };

  const toggleSectionHidden = (sectionId: string) => {
    if (sectionId === "workspace") return;
    setDraft((prev) => {
      const isHidden = prev.hiddenSections.includes(sectionId);
      return {
        ...prev,
        hiddenSections: isHidden
          ? prev.hiddenSections.filter((id) => id !== sectionId)
          : [...prev.hiddenSections, sectionId],
      };
    });
  };

  const togglePinned = (href: string) => {
    setDraft((prev) => {
      const exists = prev.pinnedHrefs.includes(href);
      if (exists) {
        return { ...prev, pinnedHrefs: prev.pinnedHrefs.filter((h) => h !== href) };
      }
      if (prev.pinnedHrefs.length >= 8) return prev;
      return { ...prev, pinnedHrefs: [...prev.pinnedHrefs, href] };
    });
  };

  const handleReset = () => {
    const reset = defaultSidebarCustomization(role);
    setDraft(reset);
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={copy.title}>
      <div className="space-y-5">
        <p className="text-xs text-ink-muted leading-relaxed">{copy.subtitle}</p>

        <SegmentedButton
          label={copy.title}
          value={tab}
          onChange={(val) => setTab(val as "presets" | "sections" | "pinned")}
          options={[
            { value: "presets", label: copy.presetsTab, icon: <Sparkles className="w-3.5 h-3.5" /> },
            { value: "sections", label: copy.sectionsTab, icon: <Layers className="w-3.5 h-3.5" /> },
            {
              value: "pinned",
              label: `${copy.pinnedTab} (${draft.pinnedHrefs.length}/8)`,
              icon: <Star className="w-3.5 h-3.5" />,
            },
          ]}
          className="w-full"
          size="sm"
        />

        {tab === "presets" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/50">
              <label className="space-y-1.5 text-xs">
                <span className="font-semibold text-on-surface block">{copy.departmentPresetLabel}</span>
                <Select
                  aria-label={copy.departmentPresetLabel}
                  value={draft.departmentKey ?? ""}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                >
                  <option value="">{copy.autoRole}</option>
                  {DEPARTMENT_KEYS.map((deptKey) => (
                    <option key={deptKey} value={deptKey}>
                      {(copy.departments as Record<string, string>)[deptKey] ?? deptKey}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="font-semibold text-on-surface block">{copy.designationPresetLabel}</span>
                <Select
                  aria-label={copy.designationPresetLabel}
                  value={draft.designationTier ?? ""}
                  onChange={(e) => handleDesignationChange(e.target.value)}
                >
                  <option value="">{copy.autoDesignation}</option>
                  {DESIGNATION_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {(copy.designations as Record<string, string>)[tier] ?? tier}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pe-1">
              {PRESET_IDS.map((presetId) => {
                const isSelected = draft.presetId === presetId;
                const label = (copy.presetNames as Record<string, string>)[presetId] ?? presetId;
                const previewGroups =
                  presetId === "role_default"
                    ? sidebarGroupOrder(role, draft.departmentKey, draft.designationTier).slice(0, 4)
                    : SIDEBAR_PRESETS[presetId].order.slice(0, 4);
                return (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() => applyNamedPreset(presetId)}
                    className={`group text-start p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "border-primary bg-secondary-container/50 text-on-secondary-container shadow-2xs"
                        : "border-outline-variant/60 bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-primary shrink-0" />
                        {label}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {previewGroups.map((gid) => (
                        <span
                          key={gid}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium"
                        >
                          {((t.navigationGroups as Record<string, string>)[gid] ?? gid)}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "sections" && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">{copy.sectionsHint}</p>
            <ul className="divide-y divide-outline-variant/50 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest max-h-80 overflow-y-auto">
              {orderedSections.map((section, idx) => {
                const isHidden = draft.hiddenSections.includes(section.id);
                const isWorkspace = section.id === "workspace";
                return (
                  <li
                    key={section.id}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs transition-colors ${
                      isHidden ? "opacity-55 bg-surface-container-low/40" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-on-surface truncate">{section.title}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {section.items.map((i) => i.label).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(section.id, -1)}
                        aria-label={`${copy.moveUp}: ${section.title}`}
                        title={copy.moveUp}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/10 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === orderedSections.length - 1}
                        onClick={() => moveSection(section.id, 1)}
                        aria-label={`${copy.moveDown}: ${section.title}`}
                        title={copy.moveDown}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/10 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isWorkspace}
                        onClick={() => toggleSectionHidden(section.id)}
                        aria-label={`${isHidden ? copy.visible : copy.hidden}: ${section.title}`}
                        className={`px-2.5 h-7 rounded-full text-[11px] font-medium inline-flex items-center gap-1 border transition-colors ${
                          isHidden
                            ? "border-outline-variant text-on-surface-variant bg-transparent"
                            : "border-primary/30 bg-secondary-container/60 text-on-secondary-container"
                        } disabled:opacity-40`}
                      >
                        {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {isHidden ? copy.hidden : copy.visible}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "pinned" && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">{copy.pinnedHint}</p>
            <div className="max-h-80 overflow-y-auto space-y-3 pe-1">
              {orderedSections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-3 space-y-2"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
                    {section.title}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isPinned = draft.pinnedHrefs.includes(item.href);
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => togglePinned(item.href)}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                            isPinned
                              ? "border-primary bg-secondary-container/70 text-on-secondary-container"
                              : "border-outline-variant/40 hover:border-primary/40 text-on-surface"
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0 text-primary" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <Star
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isPinned ? "fill-amber-400 text-amber-500" : "text-on-surface-variant/60"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {copy.resetDefault}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t.actions.cancel}
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleSave}>
              {copy.saveChanges}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
