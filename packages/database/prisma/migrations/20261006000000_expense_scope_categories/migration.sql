-- Expense categories: kind, system flag and soft-hide for custom category management.
ALTER TABLE "ExpenseCategory" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'operating';
ALTER TABLE "ExpenseCategory" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExpenseCategory" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_kind_check" CHECK ("kind" IN ('cost_of_sales', 'operating', 'payroll'));

-- Expenses record who they were incurred for: a deal (and its client), a client, or the business itself.
ALTER TABLE "Expense" ADD COLUMN "clientId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE "Expense" ADD COLUMN "paymentMethod" TEXT;
UPDATE "Expense" e SET "scope" = 'deal', "clientId" = d."contactId" FROM "CrmDeal" d WHERE e."dealId" = d."id";
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_scope_check" CHECK ("scope" IN ('deal', 'client', 'internal'));
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Expense_clientId_idx" ON "Expense"("clientId");

-- Built-in category catalogue (project costs, overheads and payroll). Existing rows keep their names.
INSERT INTO "ExpenseCategory" ("id", "slug", "nameEn", "nameAr", "color", "displayOrder", "kind", "isSystem", "isActive") VALUES
  ('expcat-01', 'gear_rental', 'Equipment & Gear Rentals', 'استئجار معدات وكاميرات', '#09937F', 1, 'cost_of_sales', true, true),
  ('expcat-02', 'crew_wages', 'Crew & Talent Wages', 'أجور الطواقم والممثلين', '#3B82F6', 2, 'cost_of_sales', true, true),
  ('expcat-03', 'travel_logistics', 'Travel & Location Logistics', 'سفر ونقل وإعاشة', '#F59E0B', 3, 'cost_of_sales', true, true),
  ('expcat-04', 'studio_overhead', 'Studio Lease & Utilities', 'إيجار ومصاريف الاستوديو', '#8B5CF6', 4, 'operating', true, true),
  ('expcat-05', 'software_licenses', 'Software, Storage & Cloud', 'برمجيات واشتراكات وسحابة', '#EC4899', 5, 'operating', true, true),
  ('expcat-06', 'marketing_pr', 'Marketing & Festival Submissions', 'تسويق ومشاركات مهرجانات', '#10B981', 6, 'operating', true, true),
  ('expcat-07', 'salaries', 'Salaries & Wages', 'الرواتب والأجور', '#0EA5E9', 7, 'payroll', true, true),
  ('expcat-08', 'gosi', 'GOSI & Social Insurance', 'التأمينات الاجتماعية', '#0284C7', 8, 'payroll', true, true),
  ('expcat-09', 'staff_benefits', 'Staff Benefits & Allowances', 'مزايا وبدلات الموظفين', '#38BDF8', 9, 'payroll', true, true),
  ('expcat-10', 'commissions', 'Sales Commissions & Incentives', 'عمولات وحوافز المبيعات', '#6366F1', 10, 'payroll', true, true),
  ('expcat-11', 'freelancers', 'Freelancers & Contractors', 'المستقلون والمتعاقدون', '#2563EB', 11, 'cost_of_sales', true, true),
  ('expcat-12', 'location_permits', 'Location Fees & Permits', 'رسوم المواقع والتصاريح', '#D97706', 12, 'cost_of_sales', true, true),
  ('expcat-13', 'props_set', 'Props, Set & Wardrobe', 'الديكور والإكسسوارات والأزياء', '#B45309', 13, 'cost_of_sales', true, true),
  ('expcat-14', 'post_production', 'Post-production Outsourcing', 'خدمات ما بعد الإنتاج الخارجية', '#7C3AED', 14, 'cost_of_sales', true, true),
  ('expcat-15', 'music_licensing', 'Music, Stock & Licensing', 'الموسيقى والمواد والتراخيص', '#C026D3', 15, 'cost_of_sales', true, true),
  ('expcat-16', 'catering', 'Catering & Hospitality', 'الضيافة والوجبات', '#EA580C', 16, 'cost_of_sales', true, true),
  ('expcat-17', 'fuel_transport', 'Fuel & Local Transport', 'الوقود والمواصلات', '#CA8A04', 17, 'operating', true, true),
  ('expcat-18', 'equipment_purchase', 'Equipment Purchases', 'شراء المعدات', '#059669', 18, 'operating', true, true),
  ('expcat-19', 'maintenance', 'Maintenance & Repairs', 'الصيانة والإصلاحات', '#65A30D', 19, 'operating', true, true),
  ('expcat-20', 'telecom', 'Telecom & Internet', 'الاتصالات والإنترنت', '#0891B2', 20, 'operating', true, true),
  ('expcat-21', 'office_supplies', 'Office Supplies & Printing', 'القرطاسية والطباعة', '#64748B', 21, 'operating', true, true),
  ('expcat-22', 'professional_fees', 'Legal & Professional Fees', 'الرسوم القانونية والمهنية', '#475569', 22, 'operating', true, true),
  ('expcat-23', 'government_fees', 'Government Fees & Licences', 'الرسوم الحكومية والتراخيص', '#334155', 23, 'operating', true, true),
  ('expcat-24', 'insurance', 'Insurance', 'التأمين', '#0F766E', 24, 'operating', true, true),
  ('expcat-25', 'bank_charges', 'Bank Charges', 'الرسوم البنكية', '#71717A', 25, 'operating', true, true),
  ('expcat-26', 'training', 'Training & Development', 'التدريب والتطوير', '#DB2777', 26, 'operating', true, true),
  ('expcat-27', 'advertising', 'Advertising & Paid Media', 'الإعلانات المدفوعة', '#16A34A', 27, 'operating', true, true),
  ('expcat-28', 'other', 'Other Expenses', 'مصروفات أخرى', '#9EADA9', 28, 'operating', true, true)
ON CONFLICT ("slug") DO UPDATE SET "kind" = EXCLUDED."kind", "isSystem" = true;
