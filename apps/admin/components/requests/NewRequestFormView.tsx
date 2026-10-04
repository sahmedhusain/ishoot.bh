"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building,
  User,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  Layers,
  ShieldAlert,
  FileQuestion,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { createConsolidatedRequestAction } from "../../app/actions/requests";
import type { CRMContact, ServiceItem } from "@ishoot/database";

interface UserOption {
  id: string;
  name: string;
  role: string;
  department?: string | null;
}

interface NewRequestFormViewProps {
  users: UserOption[];
  contacts: CRMContact[];
  services: ServiceItem[];
}

export function NewRequestFormView({
  users,
  contacts,
  services,
}: NewRequestFormViewProps) {
  const router = useRouter();
  const { isRTL } = useAdminLocale();

  const [requestType, setRequestType] = React.useState<
    "SR" | "CR" | "inquiry" | "quote_request"
  >("SR");
  const [priority, setPriority] = React.useState<string>("normal");
  const [slaDueDate, setSlaDueDate] = React.useState<string>("");

  // Client Selection / Entry
  const [selectedContactId, setSelectedContactId] = React.useState<string>("");
  const [fullName, setFullName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");
  const [company, setCompany] = React.useState<string>("");

  // Scope & Services
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>(
    [],
  );
  const [budgetRange, setBudgetRange] = React.useState<string>("");
  const [targetTimeline, setTargetTimeline] = React.useState<string>("");
  const [message, setMessage] = React.useState<string>("");

  // Routing
  const [team, setTeam] = React.useState<string>("production");
  const [assignedToId, setAssignedToId] = React.useState<string>("");

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Sync contact details when selecting an existing contact
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    if (!contactId) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      setFullName(
        contact.full_name ||
          `${contact.first_name || ""} ${contact.last_name || ""}`.trim(),
      );
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setCompany(contact.company || "");
    }
  };

  const handleToggleService = (serviceName: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceName)
        ? prev.filter((s) => s !== serviceName)
        : [...prev, serviceName],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim()) {
      toast.error(
        isRTL
          ? "يرجى تعبئة اسم العميل وبريده الإلكتروني"
          : "Full name and email are required",
      );
      return;
    }

    if (!message.trim()) {
      toast.error(
        isRTL
          ? "يرجى كتابة تفاصيل الطلب أو الشكوى"
          : "Request description is required",
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(
      isRTL ? "جارٍ تسجيل الطلب بنظام الأرشفة..." : "Creating request...",
    );

    try {
      const res = await createConsolidatedRequestAction({
        requestType,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        servicesRequested: selectedServiceIds,
        message: message.trim(),
        budgetRange: budgetRange.trim() || undefined,
        targetTimeline: targetTimeline.trim() || undefined,
        clientId: selectedContactId || undefined,
        slaDueDate: slaDueDate ? new Date(slaDueDate).toISOString() : undefined,
        priority,
        team,
        assignedToId: assignedToId || undefined,
      });

      if (res.success && res.request) {
        toast.success(
          isRTL
            ? `تم إنشاء الطلب بنجاح برقم مرجعي: ${res.request.reference}`
            : `Request created successfully (${res.request.reference})`,
          { id: toastId },
        );
        router.push(`/dashboard/requests/${res.request.id}`);
      } else {
        toast.error(res.error || "Failed to create request", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/requests"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>
            {isRTL ? "العودة لقائمة الطلبات" : "Back to Requests Inbox"}
          </span>
        </Link>
        <span className="text-xs font-mono text-slate-400">
          {isRTL ? "نظام الأرشفة والتسلسل الموحد" : "SR / CR Sequential Intake"}
        </span>
      </div>

      {/* Header */}
      <div className="border-b border-slate-200/80 dark:border-white/10 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
          {isRTL
            ? "تسجيل طلب خدمة أو شكوى جديدة"
            : "Create Service Request or Complaint"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isRTL
            ? "إصدار رقم مرجعي تسلسلي رسمي (SR/CR)، وتحديد معايير اتفاقية مستوى الخدمة، وتوزيع المهام مع فحص إتاحة الموظف"
            : "Register an official tracked request, set SLA milestones, select catalog services, and assign team responsibility with leave verification."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Ticket Classification */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Sparkles className="w-4 h-4 text-[#09937F]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {isRTL
                ? "1. تصنيف ونوع الطلب ومستوى الأولوية"
                : "1. Request Classification & SLA"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                id: "SR",
                labelEn: "Service Request (SR)",
                labelAr: "طلب خدمة إنتاج (SR)",
                descEn: "Commercial shoot, drone, studio",
                descAr: "إنتاج تجاري، تصوير جوي، ستوديو",
                icon: Layers,
                color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
              },
              {
                id: "CR",
                labelEn: "Complaint (CR)",
                labelAr: "شكوى عميل (CR)",
                descEn: "Quality, delivery delay, issue",
                descAr: "جودة المخرجات، تأخير تسليم، ملاحظات",
                icon: ShieldAlert,
                color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
              },
              {
                id: "quote_request",
                labelEn: "Quote Request",
                labelAr: "طلب عرض سعر",
                descEn: "Quotation estimation inquiry",
                descAr: "استفسار تقديري وإصدار تسعيرة",
                icon: FileQuestion,
                color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
              },
              {
                id: "inquiry",
                labelEn: "General Inquiry",
                labelAr: "استفسار عام",
                descEn: "General questions & partnership",
                descAr: "أسئلة عامة، شراكات، تواصل",
                icon: HelpCircle,
                color: "text-sky-600 bg-sky-50 dark:bg-sky-950/40",
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = requestType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRequestType(tab.id as any)}
                  className={`p-4 rounded-xl text-start border transition-all ${
                    isSelected
                      ? "border-[#09937F] bg-[#09937F]/5 ring-2 ring-[#09937F]/20"
                      : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/[0.01]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${tab.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#09937F]" />
                    )}
                  </div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">
                    {isRTL ? tab.labelAr : tab.labelEn}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {isRTL ? tab.descAr : tab.descEn}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL ? "مستوى الأولوية والأهمية" : "Priority Level"}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
              >
                <option value="low">
                  {isRTL ? "منخفضة (Low)" : "Low Priority"}
                </option>
                <option value="normal">
                  {isRTL ? "عادية (Normal)" : "Normal Priority"}
                </option>
                <option value="high">
                  {isRTL ? "مرتفعة (High)" : "High Priority"}
                </option>
                <option value="urgent">
                  {isRTL ? "عاجلة جداً (Urgent SLA)" : "Urgent SLA"}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL
                  ? "تاريخ استحقاق اتفاقية الخدمة (SLA Due Date)"
                  : "Target SLA Due Date"}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={slaDueDate}
                  onChange={(e) => setSlaDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Requester / CRM Contact */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#09937F]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {isRTL
                  ? "2. بيانات العميل وجهة الاتصال"
                  : "2. Client & Requester Details"}
              </h2>
            </div>
            {contacts.length > 0 && (
              <span className="text-[11px] text-slate-400">
                {isRTL
                  ? "ربط بملف عميل مسجل أو إدخال عميل جديد"
                  : "Link CRM contact or enter manually"}
              </span>
            )}
          </div>

          {/* Quick Contact Picker */}
          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL
                  ? "اختر من قاعدة العملاء المسجلين (اختياري)"
                  : "Select from Existing CRM Contacts (Optional)"}
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => handleSelectContact(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
              >
                <option value="">
                  {isRTL
                    ? "-- إدخال عميل جديد يدوياً --"
                    : "-- Enter new client manually --"}
                </option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || `${c.first_name} ${c.last_name || ""}`}
                    {c.company ? ` (${c.company})` : ""} - {c.email || c.phone}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL ? "الاسم الكامل للعميل *" : "Client Full Name *"}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={
                    isRTL ? "مثال: علي محمد الزياني" : "e.g. Ali Mohammed"
                  }
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL ? "اسم الشركة أو المؤسسة" : "Company / Organization"}
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={
                    isRTL ? "مثال: شركة الخليج للإنتاج" : "e.g. Gulf Media W.L.L"
                  }
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL ? "البريد الإلكتروني *" : "Email Address *"}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL ? "رقم الهاتف / واتساب" : "Phone / WhatsApp"}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+973 39000000"
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F] font-mono text-start"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Scope, Services & Details */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Layers className="w-4 h-4 text-[#09937F]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {isRTL
                ? "3. نطاق الخدمات والمتطلبات الفنية"
                : "3. Scope of Services & Description"}
            </h2>
          </div>

          {/* Service items picker */}
          {services.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isRTL
                  ? "الخدمات المطلوبة من الكتالوج (يمكن اختيار أكثر من خدمة)"
                  : "Requested Services from Catalog"}
              </label>
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => {
                  const isChecked = selectedServiceIds.includes(svc.name_en);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => handleToggleService(svc.name_en)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isChecked
                          ? "bg-[#09937F] text-white border-[#09937F] shadow-sm shadow-[#09937F]/20"
                          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      {isRTL ? svc.name_ar : svc.name_en}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL ? "الميزانية التقديرية" : "Estimated Budget"}
              </label>
              <input
                type="text"
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                placeholder={isRTL ? "مثال: 500 - 1500 د.ب" : "e.g. 500 - 1500 BHD"}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL ? "الجدول الزمني المستهدف" : "Target Timeline"}
              </label>
              <input
                type="text"
                value={targetTimeline}
                onChange={(e) => setTargetTimeline(e.target.value)}
                placeholder={
                  isRTL ? "مثال: تسليم خلال أسبوعين" : "e.g. Within 2 weeks"
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isRTL
                ? "تفاصيل الطلب أو ملخص الشكوى بالكامل *"
                : "Full Description & Specifications *"}
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isRTL
                  ? "اكتب تفاصيل المتطلبات الفنية، أهداف العمل، أو ملخص الشكوى بتوضيح كامل..."
                  : "Provide complete technical specifications, shoot requirements, or complaint background..."
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
            />
          </div>
        </div>

        {/* Section 4: Operational Assignment & Routing */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1714] border border-slate-200/80 dark:border-white/10 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Clock className="w-4 h-4 text-[#09937F]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {isRTL
                ? "4. التوجيه الإداري وتعيين المسؤول المباشر"
                : "4. Department Routing & Assignee"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL ? "الفريق المعني" : "Assigned Team"}
              </label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
              >
                <option value="production">
                  {isRTL ? "فريق الإنتاج (Production)" : "Production Team"}
                </option>
                <option value="post_production">
                  {isRTL
                    ? "المونتاج وما بعد الإنتاج (Post-Production)"
                    : "Post-Production"}
                </option>
                <option value="finance">
                  {isRTL ? "المالية والحسابات (Finance)" : "Finance & Accounts"}
                </option>
                <option value="sales">
                  {isRTL ? "المبيعات وعلاقات العملاء (Sales)" : "Sales & CRM"}
                </option>
                <option value="support">
                  {isRTL ? "خدمة العملاء (Support)" : "Customer Support"}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRTL
                  ? "الموظف المسؤول (يخضع لفحص الإجازة)"
                  : "Assignee Person (Checked against Leave)"}
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#09937F]"
              >
                <option value="">
                  {isRTL
                    ? "-- بدون تعيين مبدئي (Unassigned) --"
                    : "-- Keep Unassigned --"}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace("_", " ")})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {isRTL
                  ? "يقوم النظام تلقائياً بالتحقق من عدم وجود إجازة معتمدة للموظف في فترة التنفيذ"
                  : "Availability policy strictly verifies no approved leave overlaps this work period"}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <Link href="/dashboard/requests">
            <Button variant="outline" type="button" disabled={isSubmitting}>
              {isRTL ? "إلغاء التراجع" : "Cancel"}
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="bg-[#09937F] hover:bg-[#077a68] text-white px-6 font-semibold shadow-sm"
          >
            {isSubmitting
              ? isRTL
                ? "جارٍ إصدار الرقم وحفظ الطلب..."
                : "Creating..."
              : isRTL
                ? "تسجيل وحفظ الطلب رسمياً"
                : "Create & Save Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
