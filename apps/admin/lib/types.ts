import type { BrandTheme } from "./constants/theme";
import type { ContentLanguage } from "./constants/languages";
import type { BusinessActivity } from "./website-presets";
import { serverMessages } from "@platform/locales";
import {
  getCurrencySymbol,
  getCurrencyDecimals,
} from "@platform/config/currency";
import { SUPPORTED_CURRENCIES } from "./constants/finance";
/** A role id: one of the templates (constants/permissions.ts ALL_ROLES) or a company's own role. */
export type UserRole = string;

export interface Profile {
  employee_id?: string;
  employee_status?: string;
  suspended_at?: string;
  archived_at?: string;
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  /** Legacy free-text team name; department_id is the company's department. */
  department?: string;
  department_id?: string | null;
  department_name_en?: string;
  department_name_ar?: string;
  signature_url?: string;
  /** Discount limit (% of subtotal) without approval; null uses the company default. */
  discount_limit_percent?: number | null;
  /** Commission on collected net revenue credited to this person; null = none. */
  commission_rate_percent?: number | null;
  manager_id?: string;
  manager_name?: string;
  is_active?: boolean;
  last_login_at?: string;
  permissions?: Record<string, boolean> | any;
  created_at: string;
  updated_at: string;
}

export type SupportedCurrency = string;

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbolEn: string;
  symbolAr: string;
  standardCode: string;
  unicodePoint?: string;
  decimals: number;
}

const SUPPORTED_CURRENCY_CODES: readonly SupportedCurrency[] =
  SUPPORTED_CURRENCIES;
export const CURRENCY_CONFIGS = Object.fromEntries(
  SUPPORTED_CURRENCY_CODES.map((code) => {
    const symbol = getCurrencySymbol(code);
    return [
      code,
      {
        code,
        symbolEn: symbol,
        symbolAr: symbol,
        standardCode: getCurrencySymbol(code, false),
        decimals: getCurrencyDecimals(code),
        unicodePoint:
          Array.from(symbol).length === 1 && symbol !== code
            ? "U+" +
              symbol.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")
            : undefined,
      },
    ];
  }),
) as Record<SupportedCurrency, CurrencyConfig>;

export function getCurrencyDisplayLabel(
  code: SupportedCurrency,
  locale: string = "en",
): string {
  const cfg = CURRENCY_CONFIGS[code];
  if (!cfg) return code;
  if (cfg.symbolEn === code && cfg.symbolAr === code) return code;
  const symbol = locale === "ar" ? cfg.symbolAr : cfg.symbolEn;
  if (
    cfg.standardCode &&
    cfg.standardCode !== code &&
    cfg.standardCode !== symbol
  ) {
    return `${code} (${symbol} / ${cfg.standardCode})`;
  }
  return `${code} (${symbol})`;
}

export interface CompanySettings {
  id: string;
  /** Brand colours, fonts, radius and default mode, always complete (defaults fill anything missing). */
  theme: BrandTheme;
  /** False until the first-run setup wizard has been completed. */
  setup_completed: boolean;
  /** Languages the company writes content in; with one, both sides of every bilingual field hold the same text. */
  content_languages: ContentLanguage[];
  primary_language: ContentLanguage;
  /** What the company does (website-presets.ts); null until chosen. */
  business_activity: BusinessActivity | null;
  tagline_en?: string;
  tagline_ar?: string;
  founded_year?: number | null;
  city?: string;
  country?: string;
  map_url?: string;
  /** The public website's domain, without https:// ("example.com"). */
  website_domain?: string;
  /** The admin's own domain, if any ("admin.example.com"). */
  admin_domain?: string;
  company_name_en: string;
  company_name_ar: string;
  cr_number: string;
  vat_id?: string | null;
  vat_enabled: boolean;
  vat_percentage: number;
  vat_certificate_url?: string | null;
  default_currency: SupportedCurrency;
  currency_decimals: number;
  address_en: string;
  address_ar: string;
  phone: string;
  whatsapp_phone?: string;
  email: string;
  website: string;
  instagram_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  bank_name: string;
  bank_iban: string;
  bank_account_number: string;
  bank_swift: string;
  time_zone?: string;
  // Full-Sized Logo (Combined Icon + Wordmark text)
  full_logo_url?: string;
  dark_full_logo_url?: string;
  // Document Letterhead Attachments (PDF Banners)
  document_header_url?: string;
  document_footer_url?: string;
  // Brand Wordmark (Text only)
  logo_url: string; // Dark text (for light background)
  dark_logo_url?: string; // Light text (for dark background)
  logo_text_dark_url?: string;
  logo_text_light_url?: string;
  // Brand Icon (Icon only)
  icon_url?: string; // Light background icon
  dark_icon_url?: string; // Dark background icon
  icon_light_url?: string;
  icon_dark_url?: string;
  stamp_url?: string;
  signature_url?: string;
  payment_terms_days: number;
  default_discount_limit_percent?: number;
  quotations_always_need_approval?: boolean;
  invoice_prefix: string;
  invoice_next_number: number;
  receipt_prefix: string;
  receipt_next_number: number;
  default_invoice_notes_en?: string;
  default_invoice_notes_ar?: string;
  tax_registration_status?: boolean;
  ceo_name_en?: string;
  ceo_name_ar?: string;
  ceo_title_en?: string;
  ceo_title_ar?: string;
  ceo_quote_en?: string;
  ceo_quote_ar?: string;
  mission_en?: string;
  mission_ar?: string;
  vision_en?: string;
  vision_ar?: string;
  about_text_en?: string;
  about_text_ar?: string;
  terms_en?: string;
  terms_ar?: string;
  rules_en?: string;
  rules_ar?: string;
  updated_at: string;
}

export interface HeroBanner {
  id: string;
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  media_type: "video" | "image";
  media_url: string;
  poster_url?: string;
  display_order: number;
  is_active: boolean;
  cta_label_en?: string;
  cta_label_ar?: string;
  cta_link?: string;
  created_at: string;
}

export interface PortfolioCategory {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  display_order: number;
}

/** A labelled fact on a catalogue item, e.g. Bedrooms: 3, Duration: 6 weeks. */
export interface PortfolioAttribute {
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
}

export interface PortfolioItem {
  id: string;
  category_id?: string;
  category?: PortfolioCategory;
  slug: string;
  title_en: string;
  title_ar: string;
  /** Empty for items without a client (products, properties…). */
  client_name: string;
  year?: number;
  subtitle_en?: string;
  subtitle_ar?: string;
  price?: number;
  price_note_en?: string;
  price_note_ar?: string;
  location?: string;
  external_url?: string;
  attributes: PortfolioAttribute[];
  aspect_ratio: "16:9" | "2.39:1" | "9:16" | "1:1" | "4:5";
  thumbnail_url: string;
  preview_video_url?: string;
  full_video_url?: string;
  gallery_urls?: string[];
  description_en?: string;
  description_ar?: string;
  credits?: {
    director?: string;
    dop?: string;
    colorist?: string;
    editor?: string;
    sound?: string;
    gaffer?: string;
    lead?: string;
    specialist?: string;
    contributor?: string;
    reviewer?: string;
    [role: string]: string | undefined;
  };
  is_featured: boolean;
  display_order: number;
  created_at: string;
}

export interface ClientLogo {
  id: string;
  client_name: string;
  logo_svg_url: string;
  website_url?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface StudioEquipment {
  id: string;
  category: string;
  model_name: string;
  name_ar?: string;
  brand?: string;
  specification: string;
  description_en?: string;
  description_ar?: string;
  image_url?: string;
  quantity?: number;
  display_order: number;
  created_at: string;
}
export type CompanyEquipment = StudioEquipment;

export type InquiryStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "archived"
  | "in_progress"
  | "waiting"
  | "resolved";

export interface Inquiry {
  type?: string;
  subject?: string;
  intent?: "inquiry" | "quote_request" | "complaint" | "suggestion";
  reference?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  priority?: string;
  project_reference?: string;
  location?: string;
  confirmation_status?: string;
  notification_status?: string;
  notes?: { id: string; body: string; author: string; created_at: string }[];
  id: string;
  full_name: string;
  email: string;
  email_norm?: string;
  phone?: string;
  phone_e164?: string;
  company?: string;
  services_requested: string[];
  budget_range?: string;
  target_timeline?: string;
  message?: string;
  status: InquiryStatus;
  team?: string;
  workflow_status?:
    | "received"
    | "under_review"
    | "assigned"
    | "pending_approval"
    | "approved"
    | "confirmed"
    | "returned"
    | "in_progress"
    | "resolved"
    | "rejected";
  custom_assignments?: Array<{
    assignedToId?: string;
    assignedByName?: string;
    timestamp: string;
    notes?: string;
    action: string;
  }>;
  approval_notes?: string;
  approved_by_id?: string;
  approved_at?: string;
  return_reason?: string;
  resolution_notes?: string;
  confirmed_at?: string;
  confirmed_by_id?: string;
  confirmed_by_name?: string;
  confirmation_sent: boolean;
  notification_sent: boolean;
  locale: string;
  source?: "website" | "email" | "whatsapp" | "manual";
  customer_id?: string;
  customer?: CRMContact;
  merge_flag?: boolean;
  created_at: string;
}

export interface MomAttendee {
  name: string;
  role: string;
  email?: string;
  organization?: string;
  attended: boolean;
}

export interface MomDiscussionPoint {
  topic: string;
  notes: string;
  speaker?: string;
}

export interface MomActionItem {
  task: string;
  assignee: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "completed";
}

export interface MinuteOfMeetingItem {
  id: string;
  mom_number: string;
  title: string;
  title_ar?: string;
  meeting_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  deal_id?: string;
  deal_title?: string;
  client_id?: string;
  client_name?: string;
  attendees: MomAttendee[];
  agenda: string;
  discussion_points: MomDiscussionPoint[];
  action_items: MomActionItem[];
  decisions: string[];
  notes?: string;
  status: "draft" | "in_review" | "approved" | "shared";
  created_by_id?: string;
  created_by_name?: string;
  approved_by_id?: string;
  approved_by_name?: string;
  signature_url?: string;
  pdf_storage_path?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientAddress {
  country?: string;
  city?: string;
  area?: string;
  block?: string;
  road?: string;
  building?: string;
  unit?: string;
  line?: string;
  state?: string;
  postal_code?: string;
  po_box?: string;
}

export interface ClientContactPerson {
  id: string;
  full_name: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  notes?: string;
}

export interface ClientContactPersonInput {
  full_name: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
  notes?: string;
}

/** Everything the client form sends. Omitted fields keep their stored value on update. */
export interface ClientProfileInput {
  client_kind?: "individual" | "company" | "government";
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  company?: string;
  /** Arabic company or entity name. */
  company_ar?: string;
  company_origin?: "local" | "foreign";
  legal_form?: string;
  cr_number?: string;
  cr_expiry_date?: string;
  registration_number?: string;
  registration_country?: string;
  government_type?: string;
  supplier_number?: string;
  requires_purchase_order?: boolean;
  nationality?: string;
  industry?: string;
  website?: string;
  vat_number?: string;
  preferred_language?: "ar" | "en";
  payment_terms_days?: number;
  address?: ClientAddress;
  contact_type?: "client" | "vendor" | "freelancer" | "agency";
  notes?: string;
  contact_persons?: ClientContactPersonInput[];
}

/** A row of the client list: the profile plus its standing. Amounts are in the base currency. */
export interface ClientListRow extends CRMContact {
  rank: number | null;
  tier: "A" | "B" | "C" | "none";
  billed: number;
  collected: number;
  outstanding: number;
  overdue: boolean;
  invoice_count: number;
  deals_won: number;
  contact_persons_count: number;
  last_activity: string;
}

export interface CRMContact {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  email_norm?: string;
  phone?: string;
  phone_e164?: string;
  company?: string;
  job_title?: string;
  contact_type?: "client" | "vendor" | "freelancer" | "agency";
  notes?: string;
  address?: string;
  vat_number?: string;
  client_kind?: "individual" | "company" | "government";
  company_origin?: "local" | "foreign";
  company_name_ar?: string;
  legal_form?: string;
  cr_number?: string;
  cr_expiry_date?: string;
  registration_number?: string;
  registration_country?: string;
  government_type?: string;
  supplier_number?: string;
  requires_purchase_order?: boolean;
  nationality?: string;
  industry?: string;
  website?: string;
  preferred_language?: "ar" | "en";
  payment_terms_days?: number;
  address_details?: ClientAddress;
  contact_persons?: ClientContactPerson[];
  deals?: CRMDeal[];
  invoices?: Invoice[];
  inquiries?: Inquiry[];
  contracts?: Contract[];
  created_at: string;
  updated_at: string;
}

export interface CustomerDossier {
  pagination?: Record<string, { page: number; total: number }>;
  contact: CRMContact;
  inquiries: Inquiry[];
  deals: CRMDeal[];
  invoices: Invoice[];
  payments: Payment[];
  contracts: Contract[];
  attachments: Attachment[];
  activities: ActivityLog[];
  metrics: {
    balancesByCurrency: Record<
      string,
      { totalLtv: number; totalPaid: number; totalOutstanding: number }
    >;
    totalLtv: number;
    totalPaid: number;
    totalOutstanding: number;
    activeDealsCount: number;
    invoicesCount: number;
    winRate: number;
    avgDealSize: number;
    settledReceiptsCount: number;
    lastActivityDate?: string;
  };
}

/** A DealPipelineStage id (constants/crm.ts lists the built-in ones). */
export type DealStage = string;

export interface CRMDeal {
  id: string;
  contact_id?: string;
  title: string;
  value: number;
  currency: SupportedCurrency;
  stage: DealStage;
  probability: number;
  target_close_date?: string;
  shoot_date?: string;
  lost_reason?: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  contact?: CRMContact;
  calendar_events?: CalendarEvent[];
  contracts?: Contract[];
}

export type InvoiceStatus =
  "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";
export type DiscountType = "none" | "percentage" | "fixed";
export type DeliveryChannel = "email" | "whatsapp" | "print" | "download";

export type ServiceCategory = string;

export interface ServiceItem {
  id: string;
  code?: string;
  name_en: string;
  name_ar: string;
  category: ServiceCategory;
  description_en?: string;
  description_ar?: string;
  unit: string;
  default_rate: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceLineItem {
  id?: string;
  invoice_id?: string;
  service_id?: string;
  service?: ServiceItem;
  description_en: string;
  description_ar?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  display_order?: number;
}

export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  discountType: DiscountType,
  discountValue: number,
  vatEnabled: boolean,
  vatPercentage: number,
  currency: SupportedCurrency = "USD",
  /** Taxes besides VAT (company tax registry), each charged on the amount after discount. */
  otherTaxes: Array<{ code: string; rate: number }> = [],
) {
  if (!CURRENCY_CONFIGS[currency])
    throw new Error(serverMessages.unsupportedCurrency);
  if (
    otherTaxes.some(
      (tax) => !Number.isFinite(tax.rate) || tax.rate <= 0 || tax.rate > 100,
    )
  )
    throw new Error(serverMessages.invalidTaxRate);
  if (!["none", "percentage", "fixed"].includes(discountType))
    throw new Error(serverMessages.invalidDiscountType);
  if (
    !Number.isFinite(discountValue) ||
    discountValue < 0 ||
    (discountType === "percentage" && discountValue > 100)
  )
    throw new Error(serverMessages.invalidDiscount);
  if (
    !Number.isFinite(vatPercentage) ||
    vatPercentage < 0 ||
    vatPercentage > 100
  )
    throw new Error(serverMessages.invalidVatPercentage);
  if (
    !lineItems.length ||
    lineItems.some(
      (item) =>
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.unit_price) ||
        item.unit_price < 0,
    )
  )
    throw new Error(serverMessages.invalidInvoiceLineItems);
  const currencyConfig = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const factor = Math.pow(10, currencyConfig.decimals);

  const subtotalRaw = lineItems.reduce(
    (acc, item) =>
      acc + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );
  const subtotal = Math.round(subtotalRaw * factor) / factor;

  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount =
      Math.round(((subtotal * discountValue) / 100) * factor) / factor;
  } else if (discountType === "fixed") {
    discountAmount = Math.min(
      subtotal,
      Math.round(discountValue * factor) / factor,
    );
  }

  const afterDiscount = Math.max(
    0,
    Math.round((subtotal - discountAmount) * factor) / factor,
  );

  let vatAmount = 0;
  if (vatEnabled) {
    vatAmount =
      Math.round(((afterDiscount * vatPercentage) / 100) * factor) / factor;
  }

  const taxes = otherTaxes.map((tax) => ({
    code: tax.code,
    amount: Math.round(((afterDiscount * tax.rate) / 100) * factor) / factor,
  }));
  const otherTaxAmount =
    Math.round(taxes.reduce((sum, tax) => sum + tax.amount, 0) * factor) /
    factor;
  const totalAmount =
    Math.round((afterDiscount + vatAmount + otherTaxAmount) * factor) / factor;

  return {
    subtotal,
    discountAmount,
    afterDiscount,
    vatAmount,
    taxes,
    otherTaxAmount,
    totalAmount,
  };
}

/** One tax besides VAT as frozen on a document. */
export interface DocumentTaxLine {
  code: string;
  name_en: string;
  name_ar: string;
  rate: number;
  registration_number?: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  contact_id?: string;
  client_id?: string;
  contact_name?: string;
  deal_id?: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  after_discount: number;
  vat_enabled: boolean;
  vat_percentage: number;
  vat_amount: number;
  /** Taxes besides VAT on this invoice and their sum. */
  other_taxes?: DocumentTaxLine[];
  other_tax_amount?: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  currency: SupportedCurrency;
  language: "en" | "ar";
  status: InvoiceStatus;
  pdf_storage_path?: string;
  delivery_channel?: DeliveryChannel;
  delivered_at?: string;
  notes_en?: string;
  notes_ar?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  line_items?: InvoiceLineItem[];
  contact?: CRMContact;
  deal?: CRMDeal;
}

export type PaymentMethod =
  "bank_transfer" | "cash" | "cheque" | "card" | "online";

export interface Payment {
  id: string;
  invoice_id: string;
  receipt_number: string;
  payment_date: string;
  amount: number;
  currency: SupportedCurrency;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  receipt_pdf_path?: string;
  notification_channel?: DeliveryChannel;
  notification_sent: boolean;
  created_by?: string;
  created_at: string;
  invoice?: Invoice;
  proof_attachments?: Attachment[];
}

export interface ExpenseCategory {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  color: string;
  display_order: number;
  kind: "cost_of_sales" | "operating" | "payroll";
  is_system: boolean;
  is_active: boolean;
}

export interface Expense {
  id: string;
  category_id: string;
  deal_id?: string;
  deal_title?: string;
  client_id?: string;
  client_name?: string;
  scope: "deal" | "client" | "internal";
  payment_method?: string;
  description_en: string;
  description_ar?: string;
  amount: number;
  currency: SupportedCurrency;
  expense_date: string;
  vendor_name?: string;
  receipt_url?: string;
  is_billable?: boolean;
  is_recurring: boolean;
  recurrence_interval?: "monthly" | "quarterly" | "yearly";
  notes?: string;
  status: "pending" | "approved" | "rejected" | string;
  review_notes?: string;
  input_vat_amount?: number;
  created_by?: string;
  created_at: string;
  category?: ExpenseCategory;
  deal?: CRMDeal;
}

export interface FinancialSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  outstanding: number;
  overdue: number;
  discountsGiven: number;
  vatCollected: number;
  currency: SupportedCurrency;
}

export interface CalendarEvent {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  location?: string;
  color?: string;
  event_type: "meeting" | "shoot" | "deadline" | "reminder";
  deal_id?: string;
  created_by?: string;
  google_event_id?: string;
  google_calendar_id?: string;
  recurrence?: string;
  reminders?: Array<{ minutes: number; method: string }>;
  attendees?: Array<{ email: string; name: string; status?: string }>;
  created_at: string;
  updated_at: string;
  deal?: CRMDeal;
  /** Who sees the event: "private" | "team" | "department" | "company" | "custom". */
  visibility?: CalendarVisibility;
  audience_user_ids?: string[];
  audience_department_ids?: string[];
  audience_roles?: string[];
  /** "event": created in the calendar; "system": shown from leave, deals, invoices, payroll… (read only). */
  source?: "event" | "system";
  /** The calendar layer it belongs to, for filtering and colour. */
  layer?: CalendarLayer;
  /** Page of the record behind a system event. */
  href?: string;
  /** The viewer may change or delete it. */
  editable?: boolean;
  created_by_name?: string;
}

export type CalendarVisibility =
  "private" | "team" | "department" | "company" | "custom";
export type CalendarLayer =
  | "own"
  | "shared"
  | "leave"
  | "holidays"
  | "sales"
  | "finance"
  | "hr"
  | "payroll"
  | "meetings"
  | "requests";

export interface ActivityLog {
  id: string;
  user_id: string;
  user?: Profile;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  diff_payload?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "action";
  entity_type?: string;
  entity_id?: string;
  /** Locale key (under admin.*) for title/message; `title`/`message` hold the English fallback. */
  message_key?: string;
  message_params?: Record<string, string>;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  name_ar?: string;
  color: string;
  entity_type: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  entity_type: string;
  entity_id: string;
  uploaded_by?: string;
  created_at: string;
}

export interface Permission {
  id: string;
  role: UserRole;
  resource: string;
  action: string;
  allowed: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  user?: Profile;
  token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
}

export interface DocumentTemplate {
  id: string;
  slug: string;
  name_en: string;
  name_ar?: string;
  category: "invoice" | "receipt" | "contract" | "legal";
  body_html?: string;
  body_json?: any;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ContractStatus =
  "draft" | "sent" | "signed" | "expired" | "cancelled";

export interface Contract {
  id: string;
  contract_number: string;
  deal_id?: string;
  deal?: CRMDeal;
  contact_id?: string;
  contact?: CRMContact;
  template_id?: string;
  template?: DocumentTemplate;
  title_en: string;
  title_ar?: string;
  body_html?: string;
  status: ContractStatus;
  signature_hash?: string;
  signed_at?: string;
  valid_from?: string;
  valid_until?: string;
  pdf_storage_path?: string;
  metadata?: any;
  created_by_id?: string;
  created_by?: Profile;
  created_at: string;
  updated_at: string;
}

export interface GeneratedDocument {
  id: string;
  document_type: string;
  source_entity_type: string;
  source_entity_id: string;
  file_name: string;
  storage_path: string;
  file_size?: number;
  checksum?: string;
  generated_by_id?: string;
  generated_by?: Profile;
  created_at: string;
}

export type DocumentCategory =
  | "cr_license"
  | "vat_certificate"
  | "company_profile"
  | "bylaws"
  | "standard_contract";

export interface CompanyDocument {
  id: string;
  title_en: string;
  title_ar?: string;
  category: DocumentCategory;
  document_number?: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
  uploaded_by_id?: string;
  uploaded_by?: Profile;
  created_at: string;
  updated_at: string;
}
export interface Faq {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  category?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Statistic {
  id: string;
  labelEn: string;
  labelAr: string;
  value: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Review {
  id: string;
  authorName: string;
  authorTitleEn?: string | null;
  authorTitleAr?: string | null;
  authorAvatarUrl?: string | null;
  contentEn: string;
  contentAr: string;
  rating: number;
  sortOrder: number;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Role {
  id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  isSystem: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
export type { FeatureToggle } from "./queries/features";

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type PublicCompanySettings = Pick<
  CompanySettings,
  | "setup_completed"
  | "theme"
  | "content_languages"
  | "primary_language"
  | "business_activity"
  | "tagline_en"
  | "tagline_ar"
  | "founded_year"
  | "city"
  | "country"
  | "map_url"
  | "website_domain"
  | "default_currency"
  | "company_name_en"
  | "company_name_ar"
  | "cr_number"
  | "address_en"
  | "address_ar"
  | "phone"
  | "whatsapp_phone"
  | "email"
  | "website"
  | "instagram_url"
  | "linkedin_url"
  | "youtube_url"
  | "time_zone"
  | "full_logo_url"
  | "dark_full_logo_url"
  | "document_header_url"
  | "document_footer_url"
  | "logo_url"
  | "dark_logo_url"
  | "logo_text_dark_url"
  | "logo_text_light_url"
  | "icon_url"
  | "dark_icon_url"
  | "icon_light_url"
  | "icon_dark_url"
  | "ceo_name_en"
  | "ceo_name_ar"
  | "ceo_title_en"
  | "ceo_title_ar"
  | "ceo_quote_en"
  | "ceo_quote_ar"
  | "mission_en"
  | "mission_ar"
  | "vision_en"
  | "vision_ar"
  | "about_text_en"
  | "about_text_ar"
  | "terms_en"
  | "terms_ar"
  | "rules_en"
  | "rules_ar"
>;

export type WebSettingsInput = Partial<
  Pick<
    CompanySettings,
    | "company_name_en"
    | "company_name_ar"
    | "address_en"
    | "address_ar"
    | "phone"
    | "whatsapp_phone"
    | "email"
    | "website"
    | "instagram_url"
    | "linkedin_url"
    | "youtube_url"
    | "ceo_name_en"
    | "ceo_name_ar"
    | "ceo_title_en"
    | "ceo_title_ar"
    | "ceo_quote_en"
    | "ceo_quote_ar"
    | "mission_en"
    | "mission_ar"
    | "vision_en"
    | "vision_ar"
    | "about_text_en"
    | "about_text_ar"
    | "terms_en"
    | "terms_ar"
    | "rules_en"
    | "rules_ar"
  >
>;

export type { QuotationStatus } from "./constants/finance";
import type { QuotationStatus } from "./constants/finance";

export interface QuotationLineItem {
  id: string;
  quotationId: string;
  descriptionEn: string;
  descriptionAr?: string | null;
  quantity: any;
  unitPrice: any;
  lineTotal: any;
  orderIndex: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  revision: number;
  dealId?: string | null;
  clientId?: string | null;
  inquiryId?: string | null;
  invoiceId?: string | null;
  issueDate: Date | string;
  validUntilDate: Date | string;
  subtotal: any;
  vatEnabled: boolean;
  vatPercentage: any;
  vatAmount: any;
  otherTaxAmount?: number;
  taxes?: DocumentTaxLine[];
  discountType: string;
  discountValue: any;
  discountAmount: any;
  totalAmount: any;
  currency: string;
  language: string;
  status: QuotationStatus | string;
  acceptanceEvidence?: string | null;
  pdfStoragePath?: string | null;
  deliveryChannel?: string | null;
  deliveredAt?: Date | string | null;
  termsEn?: string | null;
  termsAr?: string | null;
  createdById?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lineItems?: QuotationLineItem[];
  rawRate?: number | null;
  fxMarginPercent?: number;
  effectiveRate?: number | null;
  approvalRevision?: number;
  contentHash?: string | null;
  client?: any;
  createdBy?: any;
  invoice?: any;
}

export type MessageDirection = "inbound" | "outbound";
export type MessageStatus =
  "queued" | "accepted" | "delivered" | "bounced" | "failed";

export interface CommunicationThread {
  id: string;
  subject: string;
  status: string;
  contactId?: string | null;
  inquiryId?: string | null;
  assignedTo?: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages?: CommunicationMessage[];
}

export interface CommunicationMessage {
  id: string;
  threadId?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
  direction: MessageDirection | string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText?: string | null;
  bodyHtml?: string | null;
  status: MessageStatus | string;
  deliveryLog?: any | null;
  invoiceId?: string | null;
  quotationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialMetric {
  id: string;
  platform: string;
  metricType: string;
  value: number;
  recordedAt: Date;
  isStale: boolean;
  errorStatus?: string | null;
  createdAt: Date;
}

export type { ApprovalTargetType, ApprovalStatus } from "./constants/approvals";
import type { ApprovalTargetType, ApprovalStatus } from "./constants/approvals";

export interface ApprovalRequest {
  id: string;
  targetType: ApprovalTargetType | string;
  targetId: string;
  revision: number;
  contentHash: string;
  status: ApprovalStatus | string;
  requestedById: string;
  requestedBy?: { id: string; fullName: string; email: string };
  policySnapshot: any;
  diffPayload?: any | null;
  discountReason?: string | null;
  decisions?: ApprovalDecision[];
  currentStep: number;
  approverIds: string[];
  selfApproved: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ApprovalDecision {
  id: string;
  approvalRequestId: string;
  decision: "approved" | "rejected" | string;
  decidedById: string;
  decidedBy?: { id: string; fullName: string; email: string };
  reason?: string | null;
  step?: number;
  decidedAt: Date | string;
}

export interface ProfileChangeRequest {
  id: string;
  userId: string;
  requestedById: string;
  managerId?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  oldValues: { fullName?: string; email?: string; [key: string]: any };
  newValues: { fullName?: string; email?: string; [key: string]: any };
  reviewedAt?: Date | string | null;
  reviewNotes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReferenceSequence {
  id: string;
  prefix: string;
  year: number;
  lastNumber: number;
  updatedAt: Date | string;
}

export type RequestType = "SR" | "CR" | "inquiry" | "quote_request";

export interface RequestEvent {
  id: string;
  inquiryId: string;
  actorId?: string | null;
  actor?: { id: string; fullName: string; email: string };
  eventType: string;
  details: any;
  createdAt: Date | string;
}

export interface RequestAssignment {
  id: string;
  inquiryId: string;
  assignedToId: string;
  assignedTo?: { id: string; fullName: string; email: string };
  assignedById: string;
  assignedBy?: { id: string; fullName: string; email: string };
  team?: string | null;
  reason?: string | null;
  active: boolean;
  createdAt: Date | string;
}

export interface RequestComment {
  id: string;
  inquiryId: string;
  authorId: string;
  author?: { id: string; fullName: string; email: string };
  body: string;
  isClientVisible: boolean;
  attachments?: any | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExchangeRateSnapshot {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  effectiveDate: Date | string;
  fetchedAt: Date | string;
  provider: string;
  sourceEvidence?: string | null;
  createdAt: Date | string;
}

export interface DocumentFx {
  id: string;
  documentType: "quotation" | "invoice" | string;
  documentId: string;
  baseAmount: number;
  targetAmount: number;
  rawRate: number;
  marginPercent: number;
  effectiveRate: number;
  rateSnapshotId?: string | null;
  createdAt: Date | string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
  currency: string;
  allocatedAt: Date | string;
}

export interface BankSettlement {
  id: string;
  paymentId: string;
  settlementDate: Date | string;
  receivedAmount: number;
  receivedCurrency: string;
  settledAmountBhd: number;
  bankFeeBhd: number;
  fxGainLossBhd: number;
  bankReference?: string | null;
  status: "settled" | "unreconciled" | string;
  createdAt: Date | string;
}

export interface Department {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  managerId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  userId?: string | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null;
  departmentId?: string | null;
  department?: Department | null;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  email?: string | null;
  phone?: string | null;
  cprNumber?: string | null;
  jobTitleEn: string;
  jobTitleAr: string;
  hireDate: Date | string;
  status: "active" | "on_leave" | "suspended" | "terminated" | string;
  leaveBalanceDays: number;
  employmentRecords?: EmploymentRecord[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EmploymentRecord {
  id: string;
  employeeId: string;
  contractType: "full_time" | "part_time" | "contract" | string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  payrollSettings?: EmployeePayrollSettings | null;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  isCurrent: boolean;
  createdAt: Date | string;
}

export interface LeaveType {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  daysAllowedPerYear: number | any;
  isPaid: boolean;
  createdAt?: Date | string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?:
    | Employee
    | {
        id: string;
        employeeNumber: string;
        firstNameEn: string;
        lastNameEn: string;
        [key: string]: any;
      };
  leaveTypeId: string;
  leaveType?: LeaveType;
  startDate: Date | string;
  endDate: Date | string;
  fullDay: boolean;
  hours?: number | null;
  dayPortion?: "full" | "half_am" | "half_pm" | "hours" | string;
  /** Days charged against the balance. */
  days?: number;
  attachmentUrl?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  reason: string;
  approvedById?: string | null;
  approvedAt?: Date | string | null;
  reviewNotes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  date: Date | string;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  status: "present" | "absent" | "half_day" | "on_leave" | "holiday" | string;
  notes?: string | null;
  createdAt: Date | string;
}

export interface BenefitPlan {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  coverageDetails?: string | null;
  employerContribution: number;
  employeeContribution: number;
  createdAt: Date | string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  periodStart: Date | string;
  periodEnd: Date | string;
  /** Window over which attendance, leave and commission were counted. */
  attendanceStart?: string | null;
  attendanceEnd?: string | null;
  payDate?: string | null;
  status:
    | "draft"
    | "calculated"
    | "submitted"
    | "approved"
    | "paid"
    | "closed"
    | string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerCost: number;
  approvedById?: string | null;
  approvedAt?: Date | string | null;
  paidAt?: Date | string | null;
  items?: PayrollItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employee?:
    | Employee
    | {
        id: string;
        employeeNumber: string;
        firstNameEn: string;
        lastNameEn: string;
        [key: string]: any;
      };
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  gosiEmployee: number;
  gosiEmployer: number;
  externalSupport?: number;
  otherDeductions: number;
  /** One-off incentives and bonuses for the month. */
  bonus?: number;
  overtimePay?: number;
  shiftAllowance?: number;
  commission?: number;
  absenceDeduction?: number;
  leaveDeduction?: number;
  latenessDeduction?: number;
  attendanceSummary?: unknown;
  adjustmentNote?: string | null;
  editedAt?: string | null;
  netSalary: number;
  paymentStatus: "pending" | "paid" | string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  payslip?: Payslip;
  createdAt: Date | string;
}

export interface Payslip {
  id: string;
  payrollItemId: string;
  employeeId: string;
  month: number;
  year: number;
  storagePath?: string | null;
  issuedAt: Date | string;
}

export interface ContributionSetting {
  mode: "percentage" | "fixed";
  value: number;
}
export interface EmployeeSupport extends ContributionSetting {
  claimPeriodMonths?: number;
  provider: string;
  startMonth: string;
  endMonth: string;
}
export interface EmployeePayrollSettings {
  employee: ContributionSetting;
  employer: ContributionSetting;
  supports: EmployeeSupport[];
}

export type CourierAgencyRecord = any;
export type ShipmentRecord = any;
export type OrgChartNode = any;
export type StockRow = any;
export type StockCountLineRecord = any;
export type MovementRecord = any;
export type ProcurementProductOption = any;
export type ProcurementLineRecord = any;
export type SupplierRecord = any;

