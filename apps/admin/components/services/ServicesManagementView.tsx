"use client";
import { errorMessage } from "../../lib/error-text";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import type { ServiceItem,ServiceCategory } from "@platform/database/types";
import { Button, Input, Select, CurrencyDisplay, Modal } from "@platform/ui";
import {
Sparkles,
Plus,
Search,Edit2,
Trash2,
CheckCircle2,
XCircle,
Tag,Layers,
DollarSign
} from "lucide-react";
import {
createServiceAction,
updateServiceAction,
deleteServiceAction,
} from "../../app/actions/services";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { SERVICE_CATEGORIES,SERVICE_UNITS } from "@platform/config/constants";
import { pickText, type ContentLanguage } from "@platform/database/constants/languages";
import { LanguageFields } from "../setup/LanguageFields";

interface ServicesManagementViewProps {
  initialServices: ServiceItem[];
  languages: readonly ContentLanguage[];
}

export function ServicesManagementView({
  initialServices,
  languages,
}: ServicesManagementViewProps) {
  const confirmAction = useConfirmation();
  const { isRTL, t } = useAdminLocale();
  const bilingual = languages.length > 1;
  const { can } = usePermissions();
  const canWrite = can("invoices", "write");
  const canDelete = can("invoices", "delete");
  const [services, setServices] = React.useState<ServiceItem[]>(initialServices);
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const serviceFormId = React.useId();
  const pendingSave = React.useRef(false);
  const [saveError, setSaveError] = React.useState("");
  const [editingService, setEditingService] = React.useState<ServiceItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Form State
  const [formCode, setFormCode] = React.useState("");
  const [formNameEn, setFormNameEn] = React.useState("");
  const [formNameAr, setFormNameAr] = React.useState("");
  const [formCategory, setFormCategory] = React.useState<ServiceCategory>("production");
  const [formUnit, setFormUnit] = React.useState<"hour" | "day" | "project" | "unit" | "minute">("day");
  const [formRate, setFormRate] = React.useState<number>(0);
  const [formDescEn, setFormDescEn] = React.useState("");
  const [formDescAr, setFormDescAr] = React.useState("");
  const [formIsActive, setFormIsActive] = React.useState(true);

  const openCreateModal = () => {
    setSaveError("");
    setEditingService(null);
    setFormCode("");
    setFormNameEn("");
    setFormNameAr("");
    setFormCategory("production");
    setFormUnit("day");
    setFormRate(0);
    setFormDescEn("");
    setFormDescAr("");
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (s: ServiceItem) => {
    setSaveError("");
    setEditingService(s);
    setFormCode(s.code || "");
    setFormNameEn(s.name_en);
    setFormNameAr(s.name_ar);
    setFormCategory(s.category);
    setFormUnit(s.unit);
    setFormRate(s.default_rate);
    setFormDescEn(s.description_en || "");
    setFormDescAr(s.description_ar || "");
    setFormIsActive(s.is_active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingSave.current) return;
    if (!formNameEn.trim() || !formNameAr.trim()) { setSaveError(t.servicesView.validationFailed); return; }
    pendingSave.current = true; setSaveError(""); setSaving(true);

    try {
      if (editingService) {
        const res = await updateServiceAction(editingService.id, {
          code: formCode.trim() || undefined,
          name_en: formNameEn.trim(),
          name_ar: formNameAr.trim(),
          category: formCategory,
          unit: formUnit,
          default_rate: Number(formRate) || 0,
          description_en: formDescEn.trim() || undefined,
          description_ar: formDescAr.trim() || undefined,
          is_active: formIsActive,
        });
        if (res.success && res.service) {
          setServices((prev) =>
            prev.map((s) => (s.id === res.service.id ? res.service : s)),
          );
        } else throw new Error(t.servicesView.saveFailed);
      } else {
        const res = await createServiceAction({
          code: formCode.trim() || undefined,
          name_en: formNameEn.trim(),
          name_ar: formNameAr.trim(),
          category: formCategory,
          unit: formUnit,
          default_rate: Number(formRate) || 0,
          description_en: formDescEn.trim() || undefined,
          description_ar: formDescAr.trim() || undefined,
          is_active: formIsActive,
        });
        if (res.success && res.service) {
          setServices((prev) => [res.service, ...prev]);
        } else throw new Error(t.servicesView.saveFailed);
      }
      setIsModalOpen(false);
    } catch (err) {
      setSaveError(errorMessage(err, t, t.servicesView.saveFailed));
    } finally {
      pendingSave.current = false; setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    return confirmAction({
      description: t.servicesView.deleteConfirmDesc,
      onConfirm: async () => {
        setDeletingId(id);
        try {
          const res = await deleteServiceAction(id);
          if (res.success) {
            setServices((prev) => prev.filter((s) => s.id !== id));
          }
        } catch (err) {
          throw err;
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  // Filtered List
  const filteredServices = React.useMemo(() => {
    return services.filter((s) => {
      if (activeCategory !== "all" && s.category !== activeCategory) return false;
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchEn = s.name_en.toLowerCase().includes(term);
        const matchAr = s.name_ar.toLowerCase().includes(term);
        const matchCode = s.code ? s.code.toLowerCase().includes(term) : false;
        const matchDesc = s.description_en ? s.description_en.toLowerCase().includes(term) : false;
        if (!matchEn && !matchAr && !matchCode && !matchDesc) return false;
      }
      return true;
    });
  }, [services, activeCategory, statusFilter, searchTerm]);

  // Statistics
  const activeCount = services.filter((s) => s.is_active).length;
  const avgRate = services.length > 0
    ? services.reduce((acc, s) => acc + s.default_rate, 0) / services.length
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.servicesView.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {canWrite && <Button
            onClick={openCreateModal}
            className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-xs rounded-full px-4 h-8 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.servicesView.addService}</span>
          </Button>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.servicesView.totalServices}</span>
            <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white ">
            {services.length}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.servicesView.activeOfferings}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 ">
            {activeCount}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.servicesView.avgRate}</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white ">
            <CurrencyDisplay amount={avgRate} currency="BHD" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{t.servicesView.categoriesCount}</span>
            <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white ">
            {SERVICE_CATEGORIES.length - 1}
          </div>
        </div>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SERVICE_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? "bg-tone-95 text-primary border border-primary/30 dark:bg-tone-15/40 dark:text-mint dark:border-tone-15 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <span>{isRTL ? cat.labelAr : cat.labelEn}</span>
              {cat.value !== "all" && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full  ${
                  isActive ? "bg-primary/20 dark:bg-mint/20" : "bg-slate-100 dark:bg-neutral-800 text-slate-500"
                }`}>
                  {services.filter((s) => s.category === cat.value).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-surface-raised p-3 rounded-xl border border-ink/15 dark:border-ink/15 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.servicesView.searchPlaceholder}
            className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] text-slate-500">{t.servicesView.statusFilterLabel}:</span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">{t.servicesView.filterAll}</option>
            <option value="active">{t.servicesView.filterActive}</option>
            <option value="inactive">{t.servicesView.filterInactive}</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-surface-raised rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">{t.servicesView.thCodeItem}</th>
                {bilingual ? <th className="py-3 px-4">{t.servicesView.thArabicTitle}</th> : null}
                <th className="py-3 px-4">{t.servicesView.thCategory}</th>
                <th className="py-3 px-4">{t.servicesView.thRateUnit}</th>
                <th className="py-3 px-4">{t.servicesView.thStatus}</th>
                <th className="py-3 px-4 text-end">{t.servicesView.thActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={bilingual ? 6 : 5} className="py-12 text-center text-slate-400">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">{t.servicesView.noServicesFound}</p>
                    <p className="text-[11px] mt-1">{t.servicesView.noServicesHint}</p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => {
                  const catConfig = SERVICE_CATEGORIES.find((c) => c.value === service.category) || SERVICE_CATEGORIES[1];
                  const unitLabel = isRTL
                    ? SERVICE_UNITS.find((u) => u.value === service.unit)?.labelAr || service.unit
                    : SERVICE_UNITS.find((u) => u.value === service.unit)?.labelEn || service.unit;

                  return (
                    <tr
                      key={service.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {bilingual ? service.name_en : pickText(service.name_en, service.name_ar, languages[0])}
                          </span>
                          <span className="text-[11px] text-slate-400 ">
                            {service.code ?? t.servicesView.customCode}
                          </span>
                        </div>
                      </td>
                      {bilingual ? (
                        <td className="py-3 px-4">
                          <span className="font-arabic text-slate-700 dark:text-slate-300 text-xs">
                            {service.name_ar}
                          </span>
                        </td>
                      ) : null}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium border ${catConfig.colorClass}`}>
                          {isRTL ? catConfig.labelAr : catConfig.labelEn}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white ">
                            <CurrencyDisplay amount={service.default_rate} currency="BHD" />
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {unitLabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {service.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.servicesManagement.active}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            {t.servicesManagement.archived}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {canWrite && <button
                            onClick={() => openEditModal(service)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={t.servicesManagement.editService}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>}
                          {canDelete && <button
                            onClick={() => handleDelete(service.id)}
                            disabled={deletingId === service.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title={t.servicesManagement.deleteService}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Service Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingService ? t.servicesView.modalEditTitle : t.servicesView.modalNewTitle} busy={saving} className="max-w-xl" footer={<div className="flex justify-end gap-3"><Button type="button" variant="ghost" disabled={saving} onClick={() => setIsModalOpen(false)}>{t.actions.cancel}</Button><Button type="submit" form={serviceFormId} disabled={saving}>{saving ? t.actions.saving : editingService ? t.actions.update : t.actions.add}</Button></div>}>
        <form id={serviceFormId} onSubmit={handleSave} onInvalidCapture={() => setSaveError(t.servicesView.validationFailed)}>
          <fieldset disabled={saving} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`${serviceFormId}-code`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.servicesView.codeLabel}
                  </label>
                  <Input
                    placeholder={t.servicesView.codePlaceholder}
                    id={`${serviceFormId}-code`}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="text-xs "
                  />
                </div>
                <div>
                  <label htmlFor={`${serviceFormId}-category`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.servicesView.categoryLabel} *
                  </label>
                  <Select
                    id={`${serviceFormId}-category`}
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="production">{t.servicesView.categoryProduction}</option>
                    <option value="post_production">{t.servicesView.categoryPost}</option>
                    <option value="equipment">{t.servicesView.categoryEquipment}</option>
                    <option value="other">{t.servicesView.categoryOther}</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LanguageFields
                  name="name"
                  label={t.servicesView.nameLabel}
                  languages={languages}
                  required
                  maxLength={300}
                  placeholder={t.servicesView.nameEnPlaceholder}
                  en={formNameEn}
                  ar={formNameAr}
                  onChange={(v) => { setFormNameEn(v.en); setFormNameAr(v.ar); }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`${serviceFormId}-rate`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.servicesView.rateLabel} ({t.financials.currency}) *
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder={t.servicesView.ratePlaceholder}
                    id={`${serviceFormId}-rate`}
                    value={formRate}
                    onChange={(e) => setFormRate(parseFloat(e.target.value) || 0)}
                    required
                    className="text-xs "
                  />
                </div>
                <div>
                  <label htmlFor={`${serviceFormId}-unit`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.servicesView.unitLabel} *
                  </label>
                  <Select
                    id={`${serviceFormId}-unit`}
                    value={formUnit}
                    onChange={(e: any) => setFormUnit(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {SERVICE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {isRTL ? u.labelAr : u.labelEn}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <LanguageFields
                name="description"
                label={t.servicesView.descLabel}
                languages={languages}
                multiline
                maxLength={2000}
                placeholder={t.servicesView.descEnPlaceholder}
                en={formDescEn}
                ar={formDescAr}
                onChange={(v) => { setFormDescEn(v.en); setFormDescAr(v.ar); }}
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-accent focus:ring-accent"
                />
                <label htmlFor="formIsActive" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  {t.servicesView.statusActive}
                </label>
              </div>

          </fieldset>
          {saveError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{saveError}</p>}
        </form>
      </Modal>
    </div>
  );
}
