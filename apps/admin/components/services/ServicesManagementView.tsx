"use client";

import * as React from "react";
import type { ServiceItem, ServiceCategory } from "@ishoot/database/types";
import { Card, Button, Input, Select, CurrencyDisplay } from "@ishoot/ui";
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  Clock,
  Layers,
  DollarSign,
  AlertCircle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from "../../app/actions/services";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const CATEGORIES: { value: string; labelEn: string; labelAr: string; color: string }[] = [
  { value: "all", labelEn: "All Services", labelAr: "جميع الخدمات", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
  { value: "production", labelEn: "Production & Shoot", labelAr: "التصوير والإنتاج", color: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300" },
  { value: "post_production", labelEn: "Post-Production & VFX", labelAr: "المونتاج والمؤثرات", color: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300" },
  { value: "pre_production", labelEn: "Pre-Production & Script", labelAr: "ما قبل الإنتاج والسيناريو", color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300" },
  { value: "studio_rental", labelEn: "Studio & Stages", labelAr: "تأجير الاستوديو والمواقع", color: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300" },
  { value: "equipment", labelEn: "Camera & Lighting Gear", labelAr: "تأجير الكاميرات والإضاءة", color: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300" },
  { value: "consulting", labelEn: "Consulting & Creative", labelAr: "الاستشارات والرؤية الإبداعية", color: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300" },
];

const UNITS = [
  { value: "day", labelEn: "Per Day (يومياً)", labelAr: "يومي" },
  { value: "hour", labelEn: "Per Hour (بالساعة)", labelAr: "بالساعة" },
  { value: "project", labelEn: "Per Project (مشروع)", labelAr: "لكل مشروع" },
  { value: "minute", labelEn: "Per Minute (بالدقيقة)", labelAr: "بالدقيقة" },
  { value: "unit", labelEn: "Per Unit / Item (قطعة)", labelAr: "لكل قطعة" },
];

interface ServicesManagementViewProps {
  initialServices: ServiceItem[];
}

export function ServicesManagementView({
  initialServices,
}: ServicesManagementViewProps) {
  const { isRTL } = useAdminLocale();
  const [services, setServices] = React.useState<ServiceItem[]>(initialServices);
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
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
    if (!formNameEn.trim() || !formNameAr.trim()) return;
    setSaving(true);

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
        }
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
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save service:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this service item?")) return;
    setDeletingId(id);
    try {
      const res = await deleteServiceAction(id);
      if (res.success) {
        setServices((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete service:", err);
    } finally {
      setDeletingId(null);
    }
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
            Services & Rate Catalog
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openCreateModal}
            className="bg-[#014842] hover:bg-[#014842]/90 text-white gap-2 shadow-xs rounded-full px-4 h-8 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Standard Service</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Total Services</span>
            <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {services.length}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Active Offerings</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {activeCount}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Average Rate</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            <CurrencyDisplay amount={avgRate} currency="BHD" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-[#dadce0] dark:border-[#3c4043] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Categories</span>
            <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {CATEGORIES.length - 1}
          </div>
        </div>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? "bg-[#e6f5f2] text-[#014842] border border-[#014842]/30 dark:bg-[#004d40]/40 dark:text-[#7de0d1] dark:border-[#004d40] font-semibold"
                  : "text-slate-600 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <span>{isRTL ? cat.labelAr : cat.labelEn}</span>
              {cat.value !== "all" && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-[#014842]/20 dark:bg-[#7de0d1]/20" : "bg-slate-100 dark:bg-neutral-800 text-slate-500"
                }`}>
                  {services.filter((s) => s.category === cat.value).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#1a1a1a] p-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search service name, code, description..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#09937F]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#09937F]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-[#121B19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Code / Item</th>
                <th className="py-3 px-4">Arabic Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Rate & Unit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">No services found</p>
                    <p className="text-[11px] mt-1">Try adjusting your category or search filter.</p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => {
                  const catConfig = CATEGORIES.find((c) => c.value === service.category) || CATEGORIES[1];
                  const unitLabel = UNITS.find((u) => u.value === service.unit)?.labelEn || service.unit;

                  return (
                    <tr
                      key={service.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {service.name_en}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {service.code || "CUSTOM"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-arabic text-slate-700 dark:text-slate-300 text-xs">
                          {service.name_ar}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium border ${catConfig.color}`}>
                          {catConfig.labelEn}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
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
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(service)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#09937F] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Service"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            disabled={deletingId === service.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121B19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#09937F]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingService ? "Edit Service Item" : "Add Standard Service"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Service Code
                  </label>
                  <Input
                    placeholder="e.g. SRV-CINE-01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#09937F]"
                  >
                    <option value="production">Production & Cinematography</option>
                    <option value="post_production">Post-Production & VFX</option>
                    <option value="pre_production">Pre-Production & Creative</option>
                    <option value="studio_rental">Studio & Stage Rental</option>
                    <option value="equipment">Camera & Lighting Gear</option>
                    <option value="consulting">Consulting & Direction</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    English Name *
                  </label>
                  <Input
                    placeholder="e.g. Cinema Drone Aerial 8K Capture"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Arabic Name *
                  </label>
                  <Input
                    placeholder="e.g. تصوير درون سينمائي جوي بدقة 8K"
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    required
                    className="text-xs text-right font-arabic"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Standard Rate (BHD) *
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    value={formRate}
                    onChange={(e) => setFormRate(parseFloat(e.target.value) || 0)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Billing Unit *
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e: any) => setFormUnit(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#09937F]"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  English Description / Deliverables
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of deliverables, crew inclusions, or gear specifications..."
                  value={formDescEn}
                  onChange={(e) => setFormDescEn(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#09937F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Arabic Description
                </label>
                <textarea
                  rows={2}
                  placeholder="تفاصيل ومخرجات الخدمة باللغة العربية..."
                  value={formDescAr}
                  onChange={(e) => setFormDescAr(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-right font-arabic focus:outline-none focus:ring-1 focus:ring-[#09937F]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-[#09937F] focus:ring-[#09937F]"
                />
                <label htmlFor="formIsActive" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active in invoice line item catalog
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-[#09937F] hover:bg-[#014842] text-white"
                >
                  {saving ? "Saving..." : editingService ? "Update Service" : "Add Service"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
