-- ==============================================================================
-- ishoot Media Production Web Ecosystem — Master Schema Migration
-- Includes: Core Profiles, Company Settings (VAT Toggle), CMS, CRM Pipeline,
--           Invoicing, Payment Receipts, Expenses, and Financial Intelligence.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Profiles & RBAC
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('super_admin', 'producer', 'editor')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Company Global Settings (Single-Row Configuration Table)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name_en TEXT NOT NULL DEFAULT 'ishoot Cinema Production',
  company_name_ar TEXT NOT NULL DEFAULT 'آي شوت للإنتاج السينمائي',
  cr_number TEXT DEFAULT 'CR-142859-1',
  vat_id TEXT, -- NULL while unregistered; filled when VAT is active
  vat_enabled BOOLEAN NOT NULL DEFAULT false, -- Non-VAT by default
  vat_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00, -- Bahrain 10% standard when toggled
  default_currency TEXT NOT NULL DEFAULT 'BHD',
  currency_decimals INT NOT NULL DEFAULT 3,
  address_en TEXT DEFAULT 'Office 42, Building 892, Road 2819, Block 428, Seef District, Kingdom of Bahrain',
  address_ar TEXT DEFAULT 'مكتب ٤٢، مبنى ٨٩٢، طريق ٢٨١٩، مجمع ٤٢٨، ضاحية السيف، مملكة البحرين',
  phone TEXT DEFAULT '+973 1700 0000',
  email TEXT DEFAULT 'hello@ishoot.bh',
  website TEXT DEFAULT 'https://ishoot.bh',
  bank_name TEXT DEFAULT 'National Bank of Bahrain (NBB)',
  bank_iban TEXT DEFAULT 'BH64NBOB00000012345678',
  bank_account_number TEXT DEFAULT '0012345678',
  bank_swift TEXT DEFAULT 'NBOBBHBM',
  logo_url TEXT DEFAULT '/images/logo-color.svg',
  payment_terms_days INT NOT NULL DEFAULT 30,
  invoice_prefix TEXT NOT NULL DEFAULT 'ISH',
  invoice_next_number INT NOT NULL DEFAULT 1,
  receipt_prefix TEXT NOT NULL DEFAULT 'RCT',
  receipt_next_number INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial single row if not exists
INSERT INTO company_settings (id, vat_enabled) 
VALUES ('00000000-0000-0000-0000-000000000001', false)
ON CONFLICT (id) DO NOTHING;

-- 3. CMS: Hero Banners
CREATE TABLE IF NOT EXISTS hero_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  subtitle_en TEXT,
  subtitle_ar TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image')),
  media_url TEXT NOT NULL,
  poster_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cta_label_en TEXT,
  cta_label_ar TEXT,
  cta_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CMS: Portfolio Categories
CREATE TABLE IF NOT EXISTS portfolio_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);

-- 5. CMS: Portfolio Items
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES portfolio_categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  client_name TEXT NOT NULL,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  aspect_ratio TEXT NOT NULL DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '2.39:1', '9:16', '1:1', '4:5')),
  thumbnail_url TEXT NOT NULL,
  preview_video_url TEXT,
  full_video_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  description_en TEXT,
  description_ar TEXT,
  credits JSONB DEFAULT '{}', -- { director, dop, colorist, editor, sound }
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. CMS: Client Logos
CREATE TABLE IF NOT EXISTS client_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  logo_svg_url TEXT NOT NULL,
  website_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CMS: Studio Equipment
CREATE TABLE IF NOT EXISTS studio_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('cameras', 'lenses', 'lighting', 'audio_grading', 'stages')),
  model_name TEXT NOT NULL,
  specification TEXT NOT NULL,
  daily_rate_bhd NUMERIC(10,3),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CRM: Inquiries
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  services_requested TEXT[] NOT NULL DEFAULT '{}',
  budget_range TEXT,
  target_timeline TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'archived')),
  confirmation_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. CRM: Contacts
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. CRM: Deals (Opportunities)
CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  currency TEXT NOT NULL DEFAULT 'BHD',
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (
    stage IN ('lead', 'proposal_sent', 'contract_signed', 'production', 'post_production', 'delivered', 'invoiced', 'closed_won', 'closed_lost')
  ),
  probability INT NOT NULL DEFAULT 10,
  target_close_date DATE,
  shoot_date DATE,
  lost_reason TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE RESTRICT,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  subtotal NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
  discount_value NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  discount_amount NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  after_discount NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  vat_enabled BOOLEAN NOT NULL DEFAULT false, -- Snapshot at creation time
  vat_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  vat_amount NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  total_amount NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  amount_paid NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  amount_due NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  currency TEXT NOT NULL DEFAULT 'BHD',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void')),
  pdf_storage_path TEXT,
  delivery_channel TEXT CHECK (delivery_channel IN ('email', 'whatsapp', 'print', 'download')),
  delivered_at TIMESTAMPTZ,
  notes_en TEXT,
  notes_ar TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description_en TEXT NOT NULL,
  description_ar TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  line_total NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  display_order INT NOT NULL DEFAULT 0
);

-- 13. Payments Ledger
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL UNIQUE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,3) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BHD',
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (
    payment_method IN ('bank_transfer', 'cash', 'cheque', 'card', 'online')
  ),
  reference_number TEXT,
  notes TEXT,
  receipt_pdf_path TEXT,
  notification_channel TEXT CHECK (notification_channel IN ('email', 'whatsapp', 'print', 'download')),
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9EADA9',
  display_order INT NOT NULL DEFAULT 0
);

-- Insert Default Expense Categories
INSERT INTO expense_categories (slug, name_en, name_ar, color, display_order) VALUES
  ('equipment_rental', 'Equipment & Gear Rental', 'إيجار معدات وتجهيزات', '#3B82F6', 1),
  ('crew_labor', 'Crew & Freelance Labor', 'طاقم العمل والكوادر المستقلة', '#8B5CF6', 2),
  ('location_permits', 'Location Permits & Scouting', 'تصاريح وتأجير مواقع التصوير', '#06B6D4', 3),
  ('travel_logistics', 'Travel, Fuel & Transport', 'سفر وتنقلات وشحن', '#F59E0B', 4),
  ('props_wardrobe', 'Props, Styling & Wardrobe', 'ديكورات وإكسسوارات وأزياء', '#EC4899', 5),
  ('catering_hospitality', 'Craft Services & Hospitality', 'وجبات وضيافة موقع التصوير', '#F97316', 6),
  ('post_production', 'Post-Production & VFX', 'تلوين خارجي ومؤثرات بصرية', '#A855F7', 7),
  ('sound_music', 'Sound Design & Music Licensing', 'تصميم صوتي وتراخيص موسيقية', '#6366F1', 8),
  ('studio_rent', 'Studio Space & Facility Lease', 'إيجار الاستوديو والمرافق', '#10B981', 9),
  ('utilities', 'Studio Power & Utilities', 'كهرباء ومرافق عامة', '#78716C', 10),
  ('software_subscriptions', 'Software & Cloud Subscriptions', 'برامج واشتراكات سحابية', '#0EA5E9', 11),
  ('marketing_ads', 'Marketing, PR & Advertising', 'تسويق وإعلانات', '#14B8A6', 12),
  ('insurance', 'Production & Equipment Insurance', 'تأمين معدات وإنتاج', '#475569', 13),
  ('maintenance_repairs', 'Camera & Drone Maintenance', 'صيانة كاميرات ودرونز', '#EAB308', 14),
  ('office_admin', 'Office Supplies & Legal', 'أدوات مكتبية وشؤون قانونية', '#64748B', 15),
  ('other', 'Other Specification', 'متفرقات أخرى', '#9EADA9', 16)
ON CONFLICT (slug) DO NOTHING;

-- 15. Operating & Production Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES expense_categories(id) ON DELETE RESTRICT,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL, -- Optional link to project
  description_en TEXT NOT NULL,
  description_ar TEXT,
  amount NUMERIC(12,3) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BHD',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT,
  receipt_url TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_interval TEXT CHECK (recurrence_interval IN ('monthly', 'quarterly', 'yearly')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Public Anon Read Policies
CREATE POLICY "Public Read Active Banners" ON hero_banners FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Categories" ON portfolio_categories FOR SELECT USING (true);
CREATE POLICY "Public Read Portfolio" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "Public Read Client Logos" ON client_logos FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Equipment" ON studio_equipment FOR SELECT USING (true);
CREATE POLICY "Public Read Company Settings" ON company_settings FOR SELECT USING (true);
CREATE POLICY "Public Insert Inquiry" ON inquiries FOR INSERT WITH CHECK (true);

-- Authenticated Staff Policies (Profiles with roles)
CREATE POLICY "Authenticated Staff Access Profiles" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Banners" ON hero_banners FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Portfolio" ON portfolio_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Categories" ON portfolio_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Logos" ON client_logos FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Equipment" ON studio_equipment FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Inquiries" ON inquiries FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Contacts" ON crm_contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Deals" ON crm_deals FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Invoices" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Line Items" ON invoice_line_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Payments" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Manage Expenses" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated Staff Read Expense Categories" ON expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super Admin Manage Settings" ON company_settings FOR ALL TO authenticated USING (true);
