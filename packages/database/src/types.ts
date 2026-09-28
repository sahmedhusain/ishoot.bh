export type UserRole =
  | "super_admin"
  | "admin"
  | "finance_manager"
  | "sales"
  | "marketing"
  | "production_manager"
  | "producer"
  | "editor"
  | "accountant"
  | "viewer";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  department?: string;
  is_active?: boolean;
  last_login_at?: string;
  permissions?: Record<string, boolean> | any;
  created_at: string;
  updated_at: string;
}

export type SupportedCurrency =
  "BHD" | "SAR" | "AED" | "KWD" | "OMR" | "QAR" | "USD";

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbolEn: string;
  symbolAr: string;
  decimals: number;
}

export const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
  BHD: { code: "BHD", symbolEn: "BHD", symbolAr: "د.ب", decimals: 3 },
  SAR: { code: "SAR", symbolEn: "SAR", symbolAr: "ر.س", decimals: 2 },
  AED: { code: "AED", symbolEn: "AED", symbolAr: "د.إ", decimals: 2 },
  KWD: { code: "KWD", symbolEn: "KWD", symbolAr: "د.ك", decimals: 3 },
  OMR: { code: "OMR", symbolEn: "OMR", symbolAr: "ر.ع", decimals: 3 },
  QAR: { code: "QAR", symbolEn: "QAR", symbolAr: "ر.ق", decimals: 2 },
  USD: { code: "USD", symbolEn: "USD", symbolAr: "$", decimals: 2 },
};

export interface CompanySettings {
  id: string;
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
  logo_url: string;
  dark_logo_url?: string;
  icon_url?: string;
  stamp_url?: string;
  signature_url?: string;
  payment_terms_days: number;
  invoice_prefix: string;
  invoice_next_number: number;
  receipt_prefix: string;
  receipt_next_number: number;
  default_invoice_notes_en?: string;
  default_invoice_notes_ar?: string;
  tax_registration_status?: boolean;
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

export interface PortfolioItem {
  id: string;
  category_id?: string;
  category?: PortfolioCategory;
  slug: string;
  title_en: string;
  title_ar: string;
  client_name: string;
  year: number;
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
  category:
    | "cameras"
    | "lenses"
    | "lighting"
    | "audio_grading"
    | "stages"
    | "grip"
    | "audio";
  model_name: string;
  name_ar?: string;
  brand?: string;
  specification: string;
  description_en?: string;
  description_ar?: string;
  image_url?: string;
  quantity?: number;
  daily_rate_bhd?: number;
  display_order: number;
  created_at: string;
}

export type InquiryStatus = "new" | "contacted" | "qualified" | "archived";

export interface Inquiry {
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
  confirmation_sent: boolean;
  notification_sent: boolean;
  locale: string;
  source?: "website" | "email" | "whatsapp" | "manual";
  customer_id?: string;
  customer?: CRMContact;
  merge_flag?: boolean;
  created_at: string;
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
  deals?: CRMDeal[];
  invoices?: Invoice[];
  inquiries?: Inquiry[];
  contracts?: Contract[];
  created_at: string;
  updated_at: string;
}

export interface CustomerDossier {
  contact: CRMContact;
  inquiries: Inquiry[];
  deals: CRMDeal[];
  invoices: Invoice[];
  payments: Payment[];
  contracts: Contract[];
  attachments: Attachment[];
  activities: ActivityLog[];
  metrics: {
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

export type DealStage =
  | "lead"
  | "proposal_sent"
  | "contract_signed"
  | "production"
  | "post_production"
  | "delivered"
  | "invoiced"
  | "closed_won"
  | "closed_lost";

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

export type ServiceCategory =
  | "pre_production"
  | "production"
  | "post_production"
  | "studio_rental"
  | "equipment"
  | "consulting"
  | "other";

export interface ServiceItem {
  id: string;
  code?: string;
  name_en: string;
  name_ar: string;
  category: ServiceCategory;
  description_en?: string;
  description_ar?: string;
  unit: "hour" | "day" | "project" | "unit" | "minute";
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
  currency: SupportedCurrency = "BHD",
) {
  const currencyConfig = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.BHD;
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

  const totalAmount = Math.round((afterDiscount + vatAmount) * factor) / factor;

  return {
    subtotal,
    discountAmount,
    afterDiscount,
    vatAmount,
    totalAmount,
  };
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
}

export interface Expense {
  id: string;
  category_id: string;
  deal_id?: string;
  description_en: string;
  description_ar?: string;
  amount: number;
  currency: SupportedCurrency;
  expense_date: string;
  vendor_name?: string;
  receipt_url?: string;
  is_recurring: boolean;
  recurrence_interval?: "monthly" | "quarterly" | "yearly";
  notes?: string;
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
}

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
