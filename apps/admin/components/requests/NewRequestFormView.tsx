"use client";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";

import { ROUTES } from "../../constants/routes";
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

  FileQuestion,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@platform/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { createConsolidatedRequestAction } from "../../app/actions/requests";
import type { CRMContact, ServiceItem } from "@platform/database";
import { ClientAutocomplete } from "../crm/ClientAutocomplete";

interface UserOption {
  id: string;
  name: string;
  role: string;
  department?: string | null;
}

interface NewRequestFormViewProps {
  users: UserOption[];
  canPickContact: boolean;
  services: ServiceItem[];
}

export function NewRequestFormView({
  users,
  canPickContact,
  services,
}: NewRequestFormViewProps) {
  const router = useRouter();
  const { t, isRTL } = useAdminLocale();

  const [requestType, setRequestType] = React.useState<
    "SR" | "inquiry" | "quote_request"
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
  const handleSelectContact = (contact: CRMContact | null) => {
    setSelectedContactId(contact?.id ?? "");
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
        t.newRequestForm.fullNameAndEmailAre,
      );
      return;
    }

    if (!message.trim()) {
      toast.error(
        t.newRequestForm.requestDescriptionIsRequired,
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(
      t.newRequestForm.creatingRequest,
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
          formatMessage(t.newRequestForm.createdWithReference, { reference: res.request.reference }),
          { id: toastId },
        );
        router.push(ROUTES.requests.detail(res.request.id));
      } else {
        toast.error(res.error || t.newRequestForm.createFailed, { id: toastId });
      }
    } catch (err: any) {
      toast.error(errorMessage(err, t, t.newRequestForm.anUnexpectedErrorOccurred), {
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
          href={ROUTES.requests.list}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>
            {t.newRequestForm.backToRequestsInbox}
          </span>
        </Link>
        <span className="text-xs font-mono text-slate-400">
          {t.newRequestForm.srCrSequentialIntake}
        </span>
      </div>

      {/* Header */}
      <div className="border-b border-slate-200/80 dark:border-white/10 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
          {t.newRequestForm.createServiceRequestOrComplaint}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t.newRequestForm.registerAnOfficialTrackedRequest}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Ticket Classification */}
        <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.newRequestForm.n1RequestClassificationAndSla}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                id: "SR",
                label: t.newRequestForm.serviceRequestSr,
                desc: t.newRequestForm.commercialShootDroneStudio,
                icon: Layers,
                color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
              },
              {
                id: "quote_request",
                label: t.newRequestForm.quoteRequest,
                desc: t.newRequestForm.quotationEstimationInquiry,
                icon: FileQuestion,
                color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
              },
              {
                id: "inquiry",
                label: t.newRequestForm.generalInquiry,
                desc: t.newRequestForm.generalQuestionsAndPartnership,
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
                  className={`p-4 rounded-xl text-start border transition-all ${isSelected
                    ? "border-accent bg-accent/5 ring-2 ring-accent/20"
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
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">
                    {tab.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {tab.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.priorityLevel}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="normal">
                  {t.newRequestForm.normalPriority}
                </option>
                <option value="high">
                  {t.newRequestForm.highPriority}
                </option>
                <option value="urgent">
                  {t.newRequestForm.urgentSla}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.targetSlaDueDate}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={slaDueDate}
                  onChange={(e) => setSlaDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Requester / CRM Contact */}
        <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.newRequestForm.n2ClientAndRequesterDetails}
              </h2>
            </div>
            {canPickContact && (
              <span className="text-[11px] text-slate-400">
                {t.newRequestForm.linkCrmContactOrEnter}
              </span>
            )}
          </div>

          {/* Quick Contact Picker — server-side search, never the whole directory */}
          {canPickContact && (
            <ClientAutocomplete
              label={
                t.newRequestForm.selectFromExistingCrmContacts
              }
              selectedContactId={selectedContactId}
              onSelect={handleSelectContact}
              allowCreate={false}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.clientFullName}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={
                    t.newRequestForm.eGAliMohammed
                  }
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.companyOrganization}
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={
                    t.newRequestForm.eGGulfMediaW
                  }
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.emailAddress}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.copy.clientEmailExample}
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.phoneWhatsapp}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+973 39000000"
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-start"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Scope, Services & Details */}
        <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Layers className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.newRequestForm.n3ScopeOfServicesAnd}
            </h2>
          </div>

          {/* Service items picker */}
          {services.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.newRequestForm.requestedServicesFromCatalog}
              </label>
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => {
                  const isChecked = selectedServiceIds.includes(svc.name_en);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => handleToggleService(svc.name_en)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${isChecked
                        ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
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
                {t.newRequestForm.estimatedBudget}
              </label>
              <input
                type="text"
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                placeholder={t.newRequestForm.eG5001500Bhd}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.targetTimeline}
              </label>
              <input
                type="text"
                value={targetTimeline}
                onChange={(e) => setTargetTimeline(e.target.value)}
                placeholder={
                  t.newRequestForm.eGWithin2Weeks
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.newRequestForm.fullDescriptionAndSpecifications}
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                t.newRequestForm.provideCompleteTechnicalSpecificationsShoot
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Section 4: Operational Assignment & Routing */}
        <div className="p-6 rounded-2xl bg-white dark:bg-surface-raised border border-slate-200/80 dark:border-white/10 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Clock className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.newRequestForm.n4DepartmentRoutingAndAssignee}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.assignedTeam}
              </label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="production">
                  {t.newRequestForm.productionTeam}
                </option>
                <option value="post_production">
                  {t.newRequestForm.postProduction}
                </option>
                <option value="finance">
                  {t.newRequestForm.financeAndAccounts}
                </option>
                <option value="sales">
                  {t.newRequestForm.salesAndCrm}
                </option>
                <option value="support">
                  {t.newRequestForm.customerSupport}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.newRequestForm.assigneePersonCheckedAgainstLeave}
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">
                  {t.newRequestForm.keepUnassigned}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace("_", " ")})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {t.newRequestForm.availabilityPolicyStrictlyVerifiesNo}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <Link href={ROUTES.requests.list}>
            <Button variant="outline" type="button" disabled={isSubmitting}>
              {t.newRequestForm.cancel}
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="bg-accent hover:bg-accent-pressed text-white px-6 font-semibold shadow-sm"
          >
            {isSubmitting
              ? t.newRequestForm.creating
              : t.newRequestForm.createAndSaveRequest}
          </Button>
        </div>
      </form>
    </div>
  );
}
