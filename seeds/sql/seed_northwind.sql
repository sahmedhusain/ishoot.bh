-- ============================================================================
-- PURE SQL SEED: Northwind Studio W.L.L.
-- Comprehensive production fixtures: 55+ Invoices, 50 Customers, 35 Contacts,
-- 40 Deals, 30 Products, 35 Expenses, 4 Payroll Runs, 25 Tasks, 15 ITSM Tickets
-- Generated: 2026-11-08T22:48:17.667Z
-- ============================================================================
BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CLEANUP PREVIOUS BUSINESS FIXTURES (Idempotent)
-- ----------------------------------------------------------------------------
TRUNCATE TABLE
    workflow.calendar_event,
    workflow.task,
    workflow.approval_decision,
    workflow.approval_request,
    workflow.official_letter,
    workflow.letter_template,
    delivery.shipment_event,
    delivery.shipment,
    delivery.route_sheet,
    delivery.vehicle,
    delivery.delivery_slot,
    delivery.delivery_zone,
    commerce.sales_order_event,
    commerce.sales_order_line,
    commerce.sales_order,
    commerce.coupon,
    commerce.customer_address,
    commerce.customer,
    inventory.stock_movement,
    inventory.stock_level,
    inventory.product,
    inventory.stock_location,
    inventory.warehouse,
    inventory.product_category,
    finance.payment,
    finance.invoice_item,
    finance.invoice,
    finance.expense,
    finance.expense_category,
    sales.inquiry,
    sales.quotation_item,
    sales.quotation,
    sales.deal,
    sales.contact,
    hr.payroll_item,
    hr.payroll_run,
    hr.attendance_entry,
    hr.leave_request,
    hr.employee,
    hr.department,
    cms.content_snapshot,
    cms.statistic,
    cms.review,
    cms.faq,
    cms.article,
    cms.page,
    itsm.ticket_comment,
    itsm.ticket_event,
    itsm.ticket,
    itsm.sla_policy,
    notify.notification,
    system.company_asset,
    system.company
CASCADE;

-- ----------------------------------------------------------------------------
-- 2. SYSTEM SERVICE (Company Profile, Assets, Modules, Sequences)
-- ----------------------------------------------------------------------------
INSERT INTO system.company (id, singleton, data, currency_locked, revision, updated_by, updated_at)
VALUES ('c0000000-0000-0000-0000-000000000001', true, '{"companyNameEn":"Northwind Studio W.L.L.","companyNameAr":"استوديو نورثويند ذ.م.م","businessActivity":"media","country":"BH","city":"Manama","contentLanguages":["ar","en"],"primaryLanguage":"ar","crNumber":"CR-000000-0","vatId":"000000000000000","vatEnabled":false,"vatPercentage":10,"defaultCurrency":"BHD","currencyDecimals":3,"timeZone":"Asia/Bahrain","addressEn":"Office 100, Example Tower, Manama, Kingdom of Bahrain","addressAr":"مكتب 100، برج المثال، المنامة، مملكة البحرين","phone":"+97317000000","whatsappPhone":"+97336000000","email":"hello@northwind.example","website":"https://northwind.example","instagramUrl":"https://instagram.com/northwind.example","linkedinUrl":"https://linkedin.com/company/northwind-example","youtubeUrl":"https://youtube.com/@northwind-example","bankName":"Example Bank","bankIban":"BH00EXMP00000000000000","bankAccountNumber":"0000000000","bankSwift":"EXMPBHBM","paymentTermsDays":30,"invoicePrefix":"INV","invoiceNextNumber":104,"receiptPrefix":"RCT","receiptNextNumber":106,"taglineEn":"Cinema Production & Creative Media Studio","taglineAr":"استوديو الإنتاج السينمائي والإعلام الإبداعي","aboutTextEn":"Premier cinematic media production house in the Kingdom of Bahrain, crafting narrative-driven brand films, commercials, and aerial cinematography.","aboutTextAr":"دار إنتاج سينمائي رائدة في مملكة البحرين، متخصصة في صناعة الأفلام الإعلانية الوثائقية والتصوير الجوي السينمائي.","missionEn":"To produce world-class cinematic visual storytelling that elevates regional brands and captures cultural narratives.","missionAr":"إنتاج محتوى بصري سينمائي بمعايير عالمية يرتقي بالهوية الإقليمية ويوثق القصص الثقافية الملهمة.","visionEn":"To become the leading full-service creative film studio and cinema equipment vault in the Arabian Gulf.","visionAr":"أن نكون الاستوديو الإبداعي السينمائي وخزينة المعدات الأكثر موثوقية وتميزاً في منطقة الخليج العربي.","ceoNameEn":"Ali Al-Arrayed","ceoNameAr":"علي العريض","ceoTitleEn":"Managing Director & Executive Producer","ceoTitleAr":"المدير العام والمنتج التنفيذي","ceoQuoteEn":"Every frame we shoot is a commitment to visual excellence, technical perfection, and compelling narrative.","ceoQuoteAr":"كل لقطة نصورها التزام بالتميز البصري، الإتقان التقني، والقصة المؤثرة.","termsEn":"Standard payment terms are net-30 days from invoice issue date. Deliverables remain company property until settlement.","termsAr":"شروط الدفع القياسية هي 30 يوماً من تاريخ الفاتورة. تظل جميع المخرجات ملكاً للشركة حتى اكتمال السداد.","rulesEn":"All crew and equipment deployments strictly adhere to local safety regulations and Ministry of Information filming guidelines.","rulesAr":"تلتزم جميع طواقم ومعدات العمل بضوابط السلامة المعتمدة وتصاريح التصوير الصادرة من وزارة الإعلام.","foundedYear":2018,"mapUrl":"https://maps.google.com/?q=26.2415,50.5369","defaultDiscountLimitPercent":15,"quotationsAlwaysNeedApproval":false,"theme":{"primary":"#2E1065","accent":"#7C3AED","radius":"lg","defaultMode":"system","fonts":{"body":{"kind":"google","family":"IBM Plex Sans Arabic"},"heading":{"kind":"google","family":"Readex Pro"}}},"logoUrl":"/api/files/brand/logo-light_dbf1f2e280f5.png","darkLogoUrl":"/api/files/brand/logo-dark_50ae2cfc6efa.png","iconUrl":"/api/files/brand/icon-light_68b1a95d35cf.png","darkIconUrl":"/api/files/brand/icon-dark_f661f555ebbe.png","stampUrl":"/api/files/brand/stamp_8df038fc524f.png","signatureUrl":"/api/files/brand/signature_28e82e5cdb91.png","websitePublished":true,"setupCompletedAt":"2026-01-01T00:00:00Z"}'::jsonb, false, 1, 'seed:sql', now())
ON CONFLICT (singleton) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('4132ca73-b7cf-41b1-afc1-26f15332d582', 'icon_dark', 'Icon for dark backgrounds', '/api/files/brand/icon-dark_f661f555ebbe.png', 'image/png', 53383, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('56b04f46-cefa-4ee1-90a0-d6e62a1383f8', 'stamp', 'Company stamp', '/api/files/brand/stamp_8df038fc524f.png', 'image/png', 394268, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('317d7f76-d479-40d7-b547-48548e049246', 'signature', 'Authorised signature', '/api/files/brand/signature_28e82e5cdb91.png', 'image/png', 51605, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('96793d5a-785c-4f86-96d7-fdd07ae39a86', 'full_logo_light', 'Full-sized logo for light backgrounds', '/api/files/brand/full-logo-light_22ee1568e332.png', 'image/png', 999, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('8ef0880e-fc87-49ea-8e60-161cad7db644', 'full_logo_dark', 'Full-sized logo for dark backgrounds', '/api/files/brand/full-logo-dark_f29765c98ebf.png', 'image/png', 767, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('fd40db3b-f5bb-442f-9f79-c93d86eb1413', 'letterhead_header', 'Document header banner', '/api/files/brand/letterhead-header_edba967e9df0.png', 'image/png', 1943, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('271be13f-f30f-43a5-9e4b-e72ecb3e8b90', 'letterhead_footer', 'Document footer banner', '/api/files/brand/letterhead-footer_d07a46c27654.png', 'image/png', 991, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('85c5763d-751f-4831-847c-84472985ca7b', 'logo_light', 'Logo for light backgrounds', '/api/files/brand/logo-light_dbf1f2e280f5.png', 'image/png', 31357, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('65b9ad1a-4991-4af9-911f-b1b568a0ecf3', 'logo_dark', 'Logo for dark backgrounds', '/api/files/brand/logo-dark_50ae2cfc6efa.png', 'image/png', 26593, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('c6ff69bd-69fa-4664-bb22-2f0c24b79a35', 'icon_light', 'Icon for light backgrounds', '/api/files/brand/icon-light_68b1a95d35cf.png', 'image/png', 63708, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();
INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)
VALUES ('2f91022c-2cbe-4b14-9530-dd07e0d39931', 'favicon', 'Icon for light backgrounds', '/api/files/brand/icon-light_68b1a95d35cf.png', 'image/png', 63708, now(), now())
ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();

INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('tasks', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('marketing', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('pr', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('legal', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('hr_payroll', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('itsm', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('audit_trail', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('notifications', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('crm_deals', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('invoicing', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('calendar', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('equipment', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('cms', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('reviews', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('products', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('procurement', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('store', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)
VALUES ('delivery', true, 'seed:sql', now())
ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();

INSERT INTO system.document_sequence (kind, prefix, next_number) VALUES ('invoice', 'INV', 201), ('receipt', 'RCT', 201) ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number;

-- ----------------------------------------------------------------------------
-- 3. FILES SERVICE (Brand Artwork, Logos, Fonts)
-- ----------------------------------------------------------------------------
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('bcdae73d-092c-491e-ab5d-692ecceea06c', '/api/files/brand/logo-text-dark_ce4688a0b9d4.png', 'system', 'logo-text-dark.png', 31357, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('c8182c1f-aabe-466e-85e4-c5f3ef396c7a', '/api/files/brand/logo-text-light_d1aa816c468b.png', 'system', 'logo-text-light.png', 26593, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('f63cbc24-d4f8-4ec6-885d-5b2b87eca940', '/api/files/brand/icon-light_8b3fd1db5088.png', 'system', 'icon-light.png', 63708, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('6e297cf1-95bb-456f-8251-dc93c3cc661e', '/api/files/brand/icon-dark_c71b9181b473.png', 'system', 'icon-dark.png', 53383, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('6191ca54-aa1c-4fbd-90af-f19a8e43e996', '/api/files/brand/stamp_4f12ae91bd08.png', 'system', 'stamp.png', 394268, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('fd4ba47b-8b11-427a-ba07-41173f8e038b', '/api/files/brand/signature_5b8ba4712137.png', 'system', 'signature.png', 51605, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('ff9f8635-f95e-4f23-a13f-0a41d98f5467', '/api/files/brand/thmanyahsans-Light_79bcb61f0046.woff2', 'system', 'thmanyahsans-Light.woff2', 72380, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('1f0c367c-172b-4807-9eab-4b0e76c551a2', '/api/files/brand/thmanyahsans-Regular_5bb4fa412273.woff2', 'system', 'thmanyahsans-Regular.woff2', 77776, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('c0a7fdcf-e540-4a6b-bb7f-0d262d853225', '/api/files/brand/thmanyahsans-Black_77e81ed0e4a1.woff2', 'system', 'thmanyahsans-Black.woff2', 77112, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('1bcac9cd-d9ca-4aec-9b2f-0454ed894864', '/api/files/brand/thmanyahsans-Bold_90f7c5b4c796.woff2', 'system', 'thmanyahsans-Bold.woff2', 79160, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('64336689-8b05-473e-b309-54de957a580c', '/api/files/brand/thmanyahsans-Medium_490bf85c58c8.woff2', 'system', 'thmanyahsans-Medium.woff2', 79064, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('176b3104-450d-431d-8294-84aef903e410', '/api/files/brand/thmanyahserifdisplay-Medium_e21a2ea53f90.woff2', 'system', 'thmanyahserifdisplay-Medium.woff2', 82552, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('b02e1e6a-0da8-4aa3-b993-bc9b63b7f40f', '/api/files/brand/thmanyahserifdisplay-Regular_214a70d9dabc.woff2', 'system', 'thmanyahserifdisplay-Regular.woff2', 81136, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('30cec7f4-b484-413c-aa2f-b7be1eb195b1', '/api/files/brand/thmanyahserifdisplay-Black_a057be61138a.woff2', 'system', 'thmanyahserifdisplay-Black.woff2', 79212, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('643a8694-751c-4263-baf6-470e93e030ba', '/api/files/brand/thmanyahserifdisplay-Light_3db143f2c1fd.woff2', 'system', 'thmanyahserifdisplay-Light.woff2', 75732, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('18ae80dd-02ef-4013-98f8-1ad7de5845c6', '/api/files/brand/thmanyahserifdisplay-Bold_d36da84ee542.woff2', 'system', 'thmanyahserifdisplay-Bold.woff2', 81988, 'font/woff2', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('90decb6d-28b7-4aea-a9df-278240e62e7a', '/api/files/avatars/be7ec92e-9822-470a-a245-13d5f3e0c40d_profile-photo.webp', 'system', 'profile-photo.webp', 54660, 'image/webp', false, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('c56e6e5f-132e-44cb-bbab-173e48a54c55', '/api/files/brand/logo-light_dbf1f2e280f5.png', 'system', 'logo-light.png', 22274, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('9118f8bd-2540-41b1-9acf-5cc3870bcac7', '/api/files/brand/logo-dark_50ae2cfc6efa.png', 'system', 'logo-dark.png', 18090, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('c7a4b24a-e7f1-4f87-b96d-9a722a415396', '/api/files/brand/icon-light_68b1a95d35cf.png', 'system', 'icon-light.png', 48576, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('6c52778c-df80-424d-b7b0-5cfaf7d3f94c', '/api/files/brand/icon-dark_f661f555ebbe.png', 'system', 'icon-dark.png', 30475, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('ffcfdd60-c877-417f-af76-22b84eb581ba', '/api/files/brand/full-logo-light_22ee1568e332.png', 'system', 'full-logo-light.png', 999, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('47d1d591-54c2-4d90-bb5e-063dcdf0e489', '/api/files/brand/full-logo-dark_f29765c98ebf.png', 'system', 'full-logo-dark.png', 767, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('135a1263-1f63-4fba-8d14-bfa6513014cd', '/api/files/brand/letterhead-header_edba967e9df0.png', 'system', 'letterhead-header.png', 1943, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('85275ff2-cb49-4ba1-8885-896c6604386e', '/api/files/brand/letterhead-footer_d07a46c27654.png', 'system', 'letterhead-footer.png', 991, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('2024eedd-a647-4243-a22f-cae990c2ea09', '/api/files/brand/stamp_8df038fc524f.png', 'system', 'stamp.png', 85916, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;
INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
VALUES ('faf0efc9-2b4d-45f9-a140-3719cbe911f7', '/api/files/brand/signature_28e82e5cdb91.png', 'system', 'signature.png', 36219, 'image/png', true, now(), now() + interval '100 years', now())
ON CONFLICT (file_url) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. IDENTITY SERVICE (Roles, Scopes, Accounts & Permissions)
-- ----------------------------------------------------------------------------
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('super_admin', 'Super Administrator', 'المسؤول العام', true, NULL, now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('admin', 'Administrator', 'مدير النظام', true, 'super_admin', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('operations_manager', 'Operations Manager', 'مدير العمليات', true, 'admin', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('finance_manager', 'Finance Manager', 'المدير المالي', true, 'admin', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('project_lead', 'Project Lead', 'مدير المشروع', true, 'operations_manager', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('editor', 'Editor', 'محرر محتوى', true, 'project_lead', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('accountant', 'Accountant', 'محاسب', true, 'finance_manager', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('sales', 'Sales Specialist', 'أخصائي مبيعات', true, 'operations_manager', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('marketing', 'Marketing Specialist', 'أخصائي تسويق', true, 'operations_manager', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('viewer', 'Viewer', 'مراقب عام', true, 'admin', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('it_admin', 'IT Super Administrator', 'مدير تقنية المعلومات العام', true, NULL, now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('it_manager', 'IT Operations Manager', 'مدير إدارة تقنية المعلومات', true, 'it_admin', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('it_lead', 'IT Team Lead', 'قائد فريق تقنية المعلومات', true, 'it_manager', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('it_engineer', 'IT Systems Engineer', 'مهندس أنظمة تقنية المعلومات', true, 'it_lead', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('it_worker', 'IT Operations Worker', 'أخصائي تشغيل تقنية المعلومات', true, 'it_lead', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('it_support', 'IT Support Specialist', 'دعم تقنية المعلومات', true, 'it_lead', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES ('it_auditor', 'IT Compliance Auditor', 'مدقق امتثال تقنية المعلومات', true, 'it_manager', now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_read', 'super_admin', 'invoices', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_write', 'super_admin', 'invoices', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_delete', 'super_admin', 'invoices', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_export', 'super_admin', 'invoices', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_approve', 'super_admin', 'invoices', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_create', 'super_admin', 'invoices', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_edit', 'super_admin', 'invoices', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_assign', 'super_admin', 'invoices', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_issue_send', 'super_admin', 'invoices', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_manage_permissions', 'super_admin', 'invoices', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_invoices_reset_credentials', 'super_admin', 'invoices', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_read', 'super_admin', 'payments', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_write', 'super_admin', 'payments', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_delete', 'super_admin', 'payments', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_export', 'super_admin', 'payments', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_approve', 'super_admin', 'payments', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_create', 'super_admin', 'payments', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_edit', 'super_admin', 'payments', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_assign', 'super_admin', 'payments', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_issue_send', 'super_admin', 'payments', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_manage_permissions', 'super_admin', 'payments', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payments_reset_credentials', 'super_admin', 'payments', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_read', 'super_admin', 'expenses', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_write', 'super_admin', 'expenses', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_delete', 'super_admin', 'expenses', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_export', 'super_admin', 'expenses', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_approve', 'super_admin', 'expenses', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_create', 'super_admin', 'expenses', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_edit', 'super_admin', 'expenses', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_assign', 'super_admin', 'expenses', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_issue_send', 'super_admin', 'expenses', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_manage_permissions', 'super_admin', 'expenses', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_expenses_reset_credentials', 'super_admin', 'expenses', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_read', 'super_admin', 'finance_analytics', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_write', 'super_admin', 'finance_analytics', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_delete', 'super_admin', 'finance_analytics', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_export', 'super_admin', 'finance_analytics', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_approve', 'super_admin', 'finance_analytics', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_create', 'super_admin', 'finance_analytics', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_edit', 'super_admin', 'finance_analytics', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_assign', 'super_admin', 'finance_analytics', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_issue_send', 'super_admin', 'finance_analytics', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_manage_permissions', 'super_admin', 'finance_analytics', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_finance_analytics_reset_credentials', 'super_admin', 'finance_analytics', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_read', 'super_admin', 'deals', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_write', 'super_admin', 'deals', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_delete', 'super_admin', 'deals', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_export', 'super_admin', 'deals', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_approve', 'super_admin', 'deals', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_create', 'super_admin', 'deals', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_edit', 'super_admin', 'deals', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_assign', 'super_admin', 'deals', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_issue_send', 'super_admin', 'deals', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_manage_permissions', 'super_admin', 'deals', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deals_reset_credentials', 'super_admin', 'deals', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_read', 'super_admin', 'contacts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_write', 'super_admin', 'contacts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_delete', 'super_admin', 'contacts', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_export', 'super_admin', 'contacts', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_approve', 'super_admin', 'contacts', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_create', 'super_admin', 'contacts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_edit', 'super_admin', 'contacts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_assign', 'super_admin', 'contacts', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_issue_send', 'super_admin', 'contacts', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_manage_permissions', 'super_admin', 'contacts', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contacts_reset_credentials', 'super_admin', 'contacts', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_read', 'super_admin', 'leads', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_write', 'super_admin', 'leads', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_delete', 'super_admin', 'leads', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_export', 'super_admin', 'leads', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_approve', 'super_admin', 'leads', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_create', 'super_admin', 'leads', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_edit', 'super_admin', 'leads', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_assign', 'super_admin', 'leads', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_issue_send', 'super_admin', 'leads', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_manage_permissions', 'super_admin', 'leads', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_leads_reset_credentials', 'super_admin', 'leads', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_read', 'super_admin', 'support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_write', 'super_admin', 'support', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_delete', 'super_admin', 'support', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_export', 'super_admin', 'support', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_approve', 'super_admin', 'support', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_create', 'super_admin', 'support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_edit', 'super_admin', 'support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_assign', 'super_admin', 'support', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_issue_send', 'super_admin', 'support', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_manage_permissions', 'super_admin', 'support', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_support_reset_credentials', 'super_admin', 'support', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_read', 'super_admin', 'reviews', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_write', 'super_admin', 'reviews', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_delete', 'super_admin', 'reviews', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_export', 'super_admin', 'reviews', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_approve', 'super_admin', 'reviews', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_create', 'super_admin', 'reviews', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_edit', 'super_admin', 'reviews', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_assign', 'super_admin', 'reviews', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_issue_send', 'super_admin', 'reviews', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_manage_permissions', 'super_admin', 'reviews', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reviews_reset_credentials', 'super_admin', 'reviews', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_read', 'super_admin', 'faqs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_write', 'super_admin', 'faqs', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_delete', 'super_admin', 'faqs', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_export', 'super_admin', 'faqs', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_approve', 'super_admin', 'faqs', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_create', 'super_admin', 'faqs', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_edit', 'super_admin', 'faqs', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_assign', 'super_admin', 'faqs', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_issue_send', 'super_admin', 'faqs', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_manage_permissions', 'super_admin', 'faqs', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_faqs_reset_credentials', 'super_admin', 'faqs', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_read', 'super_admin', 'stats', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_write', 'super_admin', 'stats', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_delete', 'super_admin', 'stats', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_export', 'super_admin', 'stats', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_approve', 'super_admin', 'stats', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_create', 'super_admin', 'stats', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_edit', 'super_admin', 'stats', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_assign', 'super_admin', 'stats', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_issue_send', 'super_admin', 'stats', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_manage_permissions', 'super_admin', 'stats', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_stats_reset_credentials', 'super_admin', 'stats', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_read', 'super_admin', 'contracts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_write', 'super_admin', 'contracts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_delete', 'super_admin', 'contracts', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_export', 'super_admin', 'contracts', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_approve', 'super_admin', 'contracts', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_create', 'super_admin', 'contracts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_edit', 'super_admin', 'contracts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_assign', 'super_admin', 'contracts', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_issue_send', 'super_admin', 'contracts', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_manage_permissions', 'super_admin', 'contracts', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_contracts_reset_credentials', 'super_admin', 'contracts', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_read', 'super_admin', 'banners', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_write', 'super_admin', 'banners', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_delete', 'super_admin', 'banners', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_export', 'super_admin', 'banners', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_approve', 'super_admin', 'banners', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_create', 'super_admin', 'banners', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_edit', 'super_admin', 'banners', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_assign', 'super_admin', 'banners', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_issue_send', 'super_admin', 'banners', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_manage_permissions', 'super_admin', 'banners', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_banners_reset_credentials', 'super_admin', 'banners', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_read', 'super_admin', 'portfolio', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_write', 'super_admin', 'portfolio', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_delete', 'super_admin', 'portfolio', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_export', 'super_admin', 'portfolio', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_approve', 'super_admin', 'portfolio', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_create', 'super_admin', 'portfolio', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_edit', 'super_admin', 'portfolio', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_assign', 'super_admin', 'portfolio', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_issue_send', 'super_admin', 'portfolio', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_manage_permissions', 'super_admin', 'portfolio', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_portfolio_reset_credentials', 'super_admin', 'portfolio', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_read', 'super_admin', 'clients', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_write', 'super_admin', 'clients', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_delete', 'super_admin', 'clients', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_export', 'super_admin', 'clients', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_approve', 'super_admin', 'clients', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_create', 'super_admin', 'clients', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_edit', 'super_admin', 'clients', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_assign', 'super_admin', 'clients', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_issue_send', 'super_admin', 'clients', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_manage_permissions', 'super_admin', 'clients', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_clients_reset_credentials', 'super_admin', 'clients', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_read', 'super_admin', 'equipment', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_write', 'super_admin', 'equipment', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_delete', 'super_admin', 'equipment', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_export', 'super_admin', 'equipment', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_approve', 'super_admin', 'equipment', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_create', 'super_admin', 'equipment', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_edit', 'super_admin', 'equipment', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_assign', 'super_admin', 'equipment', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_issue_send', 'super_admin', 'equipment', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_manage_permissions', 'super_admin', 'equipment', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_equipment_reset_credentials', 'super_admin', 'equipment', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_read', 'super_admin', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_write', 'super_admin', 'calendar', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_delete', 'super_admin', 'calendar', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_export', 'super_admin', 'calendar', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_approve', 'super_admin', 'calendar', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_create', 'super_admin', 'calendar', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_edit', 'super_admin', 'calendar', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_assign', 'super_admin', 'calendar', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_issue_send', 'super_admin', 'calendar', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_manage_permissions', 'super_admin', 'calendar', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_calendar_reset_credentials', 'super_admin', 'calendar', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_read', 'super_admin', 'users', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_write', 'super_admin', 'users', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_delete', 'super_admin', 'users', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_export', 'super_admin', 'users', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_approve', 'super_admin', 'users', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_create', 'super_admin', 'users', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_edit', 'super_admin', 'users', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_assign', 'super_admin', 'users', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_issue_send', 'super_admin', 'users', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_manage_permissions', 'super_admin', 'users', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_users_reset_credentials', 'super_admin', 'users', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_read', 'super_admin', 'settings', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_write', 'super_admin', 'settings', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_delete', 'super_admin', 'settings', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_export', 'super_admin', 'settings', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_approve', 'super_admin', 'settings', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_create', 'super_admin', 'settings', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_edit', 'super_admin', 'settings', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_assign', 'super_admin', 'settings', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_issue_send', 'super_admin', 'settings', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_manage_permissions', 'super_admin', 'settings', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_settings_reset_credentials', 'super_admin', 'settings', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_read', 'super_admin', 'audit_logs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_write', 'super_admin', 'audit_logs', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_delete', 'super_admin', 'audit_logs', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_export', 'super_admin', 'audit_logs', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_approve', 'super_admin', 'audit_logs', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_create', 'super_admin', 'audit_logs', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_edit', 'super_admin', 'audit_logs', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_assign', 'super_admin', 'audit_logs', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_issue_send', 'super_admin', 'audit_logs', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_manage_permissions', 'super_admin', 'audit_logs', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_audit_logs_reset_credentials', 'super_admin', 'audit_logs', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_read', 'super_admin', 'moms', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_write', 'super_admin', 'moms', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_delete', 'super_admin', 'moms', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_export', 'super_admin', 'moms', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_approve', 'super_admin', 'moms', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_create', 'super_admin', 'moms', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_edit', 'super_admin', 'moms', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_assign', 'super_admin', 'moms', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_issue_send', 'super_admin', 'moms', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_manage_permissions', 'super_admin', 'moms', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_moms_reset_credentials', 'super_admin', 'moms', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_read', 'super_admin', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_write', 'super_admin', 'requests', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_delete', 'super_admin', 'requests', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_export', 'super_admin', 'requests', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_approve', 'super_admin', 'requests', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_create', 'super_admin', 'requests', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_edit', 'super_admin', 'requests', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_assign', 'super_admin', 'requests', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_issue_send', 'super_admin', 'requests', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_manage_permissions', 'super_admin', 'requests', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_requests_reset_credentials', 'super_admin', 'requests', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_read', 'super_admin', 'quotations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_write', 'super_admin', 'quotations', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_delete', 'super_admin', 'quotations', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_export', 'super_admin', 'quotations', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_approve', 'super_admin', 'quotations', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_create', 'super_admin', 'quotations', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_edit', 'super_admin', 'quotations', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_assign', 'super_admin', 'quotations', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_issue_send', 'super_admin', 'quotations', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_manage_permissions', 'super_admin', 'quotations', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_quotations_reset_credentials', 'super_admin', 'quotations', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_read', 'super_admin', 'employees', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_write', 'super_admin', 'employees', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_delete', 'super_admin', 'employees', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_export', 'super_admin', 'employees', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_approve', 'super_admin', 'employees', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_create', 'super_admin', 'employees', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_edit', 'super_admin', 'employees', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_assign', 'super_admin', 'employees', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_issue_send', 'super_admin', 'employees', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_manage_permissions', 'super_admin', 'employees', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_employees_reset_credentials', 'super_admin', 'employees', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_read', 'super_admin', 'payroll', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_write', 'super_admin', 'payroll', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_delete', 'super_admin', 'payroll', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_export', 'super_admin', 'payroll', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_approve', 'super_admin', 'payroll', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_create', 'super_admin', 'payroll', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_edit', 'super_admin', 'payroll', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_assign', 'super_admin', 'payroll', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_issue_send', 'super_admin', 'payroll', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_manage_permissions', 'super_admin', 'payroll', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_payroll_reset_credentials', 'super_admin', 'payroll', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_read', 'super_admin', 'benefits', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_write', 'super_admin', 'benefits', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_delete', 'super_admin', 'benefits', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_export', 'super_admin', 'benefits', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_approve', 'super_admin', 'benefits', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_create', 'super_admin', 'benefits', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_edit', 'super_admin', 'benefits', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_assign', 'super_admin', 'benefits', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_issue_send', 'super_admin', 'benefits', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_manage_permissions', 'super_admin', 'benefits', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_benefits_reset_credentials', 'super_admin', 'benefits', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_read', 'super_admin', 'reports', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_write', 'super_admin', 'reports', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_delete', 'super_admin', 'reports', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_export', 'super_admin', 'reports', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_approve', 'super_admin', 'reports', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_create', 'super_admin', 'reports', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_edit', 'super_admin', 'reports', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_assign', 'super_admin', 'reports', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_issue_send', 'super_admin', 'reports', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_manage_permissions', 'super_admin', 'reports', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_reports_reset_credentials', 'super_admin', 'reports', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_edit', 'super_admin', 'letters', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_read', 'super_admin', 'profile_changes', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_write', 'super_admin', 'profile_changes', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_delete', 'super_admin', 'profile_changes', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_export', 'super_admin', 'profile_changes', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_approve', 'super_admin', 'profile_changes', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_create', 'super_admin', 'profile_changes', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_edit', 'super_admin', 'profile_changes', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_assign', 'super_admin', 'profile_changes', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_issue_send', 'super_admin', 'profile_changes', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_manage_permissions', 'super_admin', 'profile_changes', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_profile_changes_reset_credentials', 'super_admin', 'profile_changes', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_read', 'super_admin', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_write', 'super_admin', 'self_service', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_delete', 'super_admin', 'self_service', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_export', 'super_admin', 'self_service', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_approve', 'super_admin', 'self_service', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_create', 'super_admin', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_edit', 'super_admin', 'self_service', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_assign', 'super_admin', 'self_service', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_issue_send', 'super_admin', 'self_service', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_manage_permissions', 'super_admin', 'self_service', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_self_service_reset_credentials', 'super_admin', 'self_service', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_read', 'super_admin', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_write', 'super_admin', 'it_support', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_delete', 'super_admin', 'it_support', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_export', 'super_admin', 'it_support', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_approve', 'super_admin', 'it_support', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_create', 'super_admin', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_edit', 'super_admin', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_assign', 'super_admin', 'it_support', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_issue_send', 'super_admin', 'it_support', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_manage_permissions', 'super_admin', 'it_support', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_it_support_reset_credentials', 'super_admin', 'it_support', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_read', 'super_admin', 'social', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_write', 'super_admin', 'social', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_delete', 'super_admin', 'social', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_export', 'super_admin', 'social', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_approve', 'super_admin', 'social', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_create', 'super_admin', 'social', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_edit', 'super_admin', 'social', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_assign', 'super_admin', 'social', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_issue_send', 'super_admin', 'social', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_manage_permissions', 'super_admin', 'social', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_social_reset_credentials', 'super_admin', 'social', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_read', 'super_admin', 'assets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_write', 'super_admin', 'assets', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_delete', 'super_admin', 'assets', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_export', 'super_admin', 'assets', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_approve', 'super_admin', 'assets', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_create', 'super_admin', 'assets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_edit', 'super_admin', 'assets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_assign', 'super_admin', 'assets', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_issue_send', 'super_admin', 'assets', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_manage_permissions', 'super_admin', 'assets', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_assets_reset_credentials', 'super_admin', 'assets', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_read', 'super_admin', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_write', 'super_admin', 'announcements', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_delete', 'super_admin', 'announcements', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_export', 'super_admin', 'announcements', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_approve', 'super_admin', 'announcements', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_create', 'super_admin', 'announcements', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_edit', 'super_admin', 'announcements', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_assign', 'super_admin', 'announcements', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_issue_send', 'super_admin', 'announcements', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_manage_permissions', 'super_admin', 'announcements', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_announcements_reset_credentials', 'super_admin', 'announcements', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_read', 'super_admin', 'letters', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_write', 'super_admin', 'letters', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_delete', 'super_admin', 'letters', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_export', 'super_admin', 'letters', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_approve', 'super_admin', 'letters', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_create', 'super_admin', 'letters', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_assign', 'super_admin', 'letters', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_issue_send', 'super_admin', 'letters', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_manage_permissions', 'super_admin', 'letters', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_letters_reset_credentials', 'super_admin', 'letters', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_read', 'super_admin', 'pages', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_write', 'super_admin', 'pages', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_delete', 'super_admin', 'pages', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_export', 'super_admin', 'pages', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_approve', 'super_admin', 'pages', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_create', 'super_admin', 'pages', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_edit', 'super_admin', 'pages', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_assign', 'super_admin', 'pages', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_issue_send', 'super_admin', 'pages', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_manage_permissions', 'super_admin', 'pages', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_pages_reset_credentials', 'super_admin', 'pages', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_read', 'super_admin', 'articles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_write', 'super_admin', 'articles', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_delete', 'super_admin', 'articles', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_export', 'super_admin', 'articles', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_approve', 'super_admin', 'articles', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_create', 'super_admin', 'articles', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_edit', 'super_admin', 'articles', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_assign', 'super_admin', 'articles', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_issue_send', 'super_admin', 'articles', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_manage_permissions', 'super_admin', 'articles', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_articles_reset_credentials', 'super_admin', 'articles', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_read', 'super_admin', 'cms_code', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_write', 'super_admin', 'cms_code', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_delete', 'super_admin', 'cms_code', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_export', 'super_admin', 'cms_code', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_approve', 'super_admin', 'cms_code', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_create', 'super_admin', 'cms_code', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_edit', 'super_admin', 'cms_code', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_assign', 'super_admin', 'cms_code', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_issue_send', 'super_admin', 'cms_code', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_manage_permissions', 'super_admin', 'cms_code', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_cms_code_reset_credentials', 'super_admin', 'cms_code', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_read', 'super_admin', 'products', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_write', 'super_admin', 'products', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_delete', 'super_admin', 'products', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_export', 'super_admin', 'products', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_approve', 'super_admin', 'products', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_create', 'super_admin', 'products', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_edit', 'super_admin', 'products', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_assign', 'super_admin', 'products', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_issue_send', 'super_admin', 'products', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_manage_permissions', 'super_admin', 'products', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_products_reset_credentials', 'super_admin', 'products', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_read', 'super_admin', 'inventory', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_write', 'super_admin', 'inventory', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_delete', 'super_admin', 'inventory', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_export', 'super_admin', 'inventory', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_approve', 'super_admin', 'inventory', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_create', 'super_admin', 'inventory', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_edit', 'super_admin', 'inventory', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_assign', 'super_admin', 'inventory', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_issue_send', 'super_admin', 'inventory', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_manage_permissions', 'super_admin', 'inventory', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_inventory_reset_credentials', 'super_admin', 'inventory', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_read', 'super_admin', 'procurement', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_write', 'super_admin', 'procurement', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_delete', 'super_admin', 'procurement', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_export', 'super_admin', 'procurement', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_approve', 'super_admin', 'procurement', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_create', 'super_admin', 'procurement', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_edit', 'super_admin', 'procurement', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_assign', 'super_admin', 'procurement', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_issue_send', 'super_admin', 'procurement', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_manage_permissions', 'super_admin', 'procurement', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_procurement_reset_credentials', 'super_admin', 'procurement', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_read', 'super_admin', 'orders', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_write', 'super_admin', 'orders', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_delete', 'super_admin', 'orders', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_export', 'super_admin', 'orders', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_approve', 'super_admin', 'orders', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_create', 'super_admin', 'orders', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_edit', 'super_admin', 'orders', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_assign', 'super_admin', 'orders', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_issue_send', 'super_admin', 'orders', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_manage_permissions', 'super_admin', 'orders', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_orders_reset_credentials', 'super_admin', 'orders', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_read', 'super_admin', 'deliveries', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_write', 'super_admin', 'deliveries', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_delete', 'super_admin', 'deliveries', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_export', 'super_admin', 'deliveries', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_approve', 'super_admin', 'deliveries', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_create', 'super_admin', 'deliveries', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_edit', 'super_admin', 'deliveries', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_assign', 'super_admin', 'deliveries', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_issue_send', 'super_admin', 'deliveries', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_manage_permissions', 'super_admin', 'deliveries', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_deliveries_reset_credentials', 'super_admin', 'deliveries', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_read', 'super_admin', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_write', 'super_admin', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_delete', 'super_admin', 'tasks', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_export', 'super_admin', 'tasks', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_approve', 'super_admin', 'tasks', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_create', 'super_admin', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_edit', 'super_admin', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_assign', 'super_admin', 'tasks', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_issue_send', 'super_admin', 'tasks', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_manage_permissions', 'super_admin', 'tasks', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_tasks_reset_credentials', 'super_admin', 'tasks', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_read', 'super_admin', 'marketing', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_write', 'super_admin', 'marketing', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_delete', 'super_admin', 'marketing', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_export', 'super_admin', 'marketing', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_approve', 'super_admin', 'marketing', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_create', 'super_admin', 'marketing', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_edit', 'super_admin', 'marketing', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_assign', 'super_admin', 'marketing', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_issue_send', 'super_admin', 'marketing', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_manage_permissions', 'super_admin', 'marketing', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_marketing_reset_credentials', 'super_admin', 'marketing', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_read', 'super_admin', 'press', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_write', 'super_admin', 'press', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_delete', 'super_admin', 'press', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_export', 'super_admin', 'press', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_approve', 'super_admin', 'press', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_create', 'super_admin', 'press', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_edit', 'super_admin', 'press', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_assign', 'super_admin', 'press', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_issue_send', 'super_admin', 'press', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_manage_permissions', 'super_admin', 'press', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_press_reset_credentials', 'super_admin', 'press', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_read', 'super_admin', 'legal', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_write', 'super_admin', 'legal', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_delete', 'super_admin', 'legal', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_export', 'super_admin', 'legal', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_approve', 'super_admin', 'legal', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_create', 'super_admin', 'legal', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_edit', 'super_admin', 'legal', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_assign', 'super_admin', 'legal', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_issue_send', 'super_admin', 'legal', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_manage_permissions', 'super_admin', 'legal', 'manage_permissions', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_super_admin_legal_reset_credentials', 'super_admin', 'legal', 'reset_credentials', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_marketing_read', 'admin', 'marketing', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_marketing_write', 'admin', 'marketing', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_marketing_create', 'admin', 'marketing', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_marketing_edit', 'admin', 'marketing', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_marketing_delete', 'admin', 'marketing', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_marketing_export', 'admin', 'marketing', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_marketing_assign', 'admin', 'marketing', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_press_read', 'admin', 'press', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_press_write', 'admin', 'press', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_press_create', 'admin', 'press', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_press_edit', 'admin', 'press', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_press_delete', 'admin', 'press', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_press_export', 'admin', 'press', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_legal_read', 'admin', 'legal', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_legal_write', 'admin', 'legal', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_legal_create', 'admin', 'legal', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_legal_edit', 'admin', 'legal', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_legal_delete', 'admin', 'legal', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_legal_export', 'admin', 'legal', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_legal_assign', 'admin', 'legal', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_tasks_read', 'admin', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_tasks_write', 'admin', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_tasks_create', 'admin', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_tasks_edit', 'admin', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_tasks_delete', 'admin', 'tasks', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_tasks_export', 'admin', 'tasks', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_tasks_assign', 'admin', 'tasks', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deliveries_read', 'admin', 'deliveries', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deliveries_write', 'admin', 'deliveries', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deliveries_create', 'admin', 'deliveries', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deliveries_edit', 'admin', 'deliveries', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deliveries_delete', 'admin', 'deliveries', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deliveries_export', 'admin', 'deliveries', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deliveries_approve', 'admin', 'deliveries', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deliveries_assign', 'admin', 'deliveries', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_orders_read', 'admin', 'orders', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_orders_write', 'admin', 'orders', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_orders_create', 'admin', 'orders', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_orders_edit', 'admin', 'orders', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_orders_delete', 'admin', 'orders', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_orders_export', 'admin', 'orders', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_orders_approve', 'admin', 'orders', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_procurement_read', 'admin', 'procurement', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_procurement_write', 'admin', 'procurement', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_procurement_create', 'admin', 'procurement', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_procurement_edit', 'admin', 'procurement', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_procurement_delete', 'admin', 'procurement', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_procurement_export', 'admin', 'procurement', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_procurement_approve', 'admin', 'procurement', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_inventory_read', 'admin', 'inventory', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_inventory_write', 'admin', 'inventory', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_inventory_create', 'admin', 'inventory', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_inventory_edit', 'admin', 'inventory', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_inventory_delete', 'admin', 'inventory', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_inventory_export', 'admin', 'inventory', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_inventory_approve', 'admin', 'inventory', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_products_read', 'admin', 'products', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_products_write', 'admin', 'products', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_products_create', 'admin', 'products', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_products_edit', 'admin', 'products', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_products_delete', 'admin', 'products', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_products_export', 'admin', 'products', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_support_read', 'admin', 'support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_support_write', 'admin', 'support', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_support_create', 'admin', 'support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_support_edit', 'admin', 'support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_support_delete', 'admin', 'support', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_reviews_read', 'admin', 'reviews', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_reviews_write', 'admin', 'reviews', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_reviews_create', 'admin', 'reviews', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_reviews_edit', 'admin', 'reviews', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_reviews_delete', 'admin', 'reviews', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_faqs_read', 'admin', 'faqs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_faqs_write', 'admin', 'faqs', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_faqs_create', 'admin', 'faqs', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_faqs_edit', 'admin', 'faqs', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_faqs_delete', 'admin', 'faqs', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_stats_read', 'admin', 'stats', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_stats_write', 'admin', 'stats', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_stats_create', 'admin', 'stats', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_stats_edit', 'admin', 'stats', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_stats_delete', 'admin', 'stats', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_invoices_read', 'admin', 'invoices', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_invoices_write', 'admin', 'invoices', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_invoices_create', 'admin', 'invoices', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_invoices_edit', 'admin', 'invoices', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_invoices_export', 'admin', 'invoices', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_payments_read', 'admin', 'payments', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_payments_write', 'admin', 'payments', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_payments_create', 'admin', 'payments', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_payments_edit', 'admin', 'payments', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_payments_export', 'admin', 'payments', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_expenses_read', 'admin', 'expenses', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_expenses_write', 'admin', 'expenses', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_expenses_create', 'admin', 'expenses', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_expenses_edit', 'admin', 'expenses', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_expenses_export', 'admin', 'expenses', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_finance_analytics_read', 'admin', 'finance_analytics', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_finance_analytics_export', 'admin', 'finance_analytics', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deals_read', 'admin', 'deals', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deals_write', 'admin', 'deals', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deals_create', 'admin', 'deals', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deals_edit', 'admin', 'deals', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deals_delete', 'admin', 'deals', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_deals_export', 'admin', 'deals', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contacts_read', 'admin', 'contacts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contacts_write', 'admin', 'contacts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contacts_create', 'admin', 'contacts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contacts_edit', 'admin', 'contacts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contacts_delete', 'admin', 'contacts', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contacts_export', 'admin', 'contacts', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_leads_read', 'admin', 'leads', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_leads_write', 'admin', 'leads', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_leads_create', 'admin', 'leads', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_leads_edit', 'admin', 'leads', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_leads_delete', 'admin', 'leads', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_leads_export', 'admin', 'leads', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contracts_read', 'admin', 'contracts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contracts_write', 'admin', 'contracts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contracts_create', 'admin', 'contracts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contracts_edit', 'admin', 'contracts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_contracts_export', 'admin', 'contracts', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_banners_read', 'admin', 'banners', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_banners_write', 'admin', 'banners', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_banners_create', 'admin', 'banners', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_banners_edit', 'admin', 'banners', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_banners_delete', 'admin', 'banners', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_portfolio_read', 'admin', 'portfolio', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_portfolio_write', 'admin', 'portfolio', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_portfolio_create', 'admin', 'portfolio', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_portfolio_edit', 'admin', 'portfolio', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_portfolio_delete', 'admin', 'portfolio', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_clients_read', 'admin', 'clients', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_clients_write', 'admin', 'clients', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_clients_create', 'admin', 'clients', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_clients_edit', 'admin', 'clients', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_clients_delete', 'admin', 'clients', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_equipment_read', 'admin', 'equipment', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_equipment_write', 'admin', 'equipment', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_equipment_create', 'admin', 'equipment', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_equipment_edit', 'admin', 'equipment', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_equipment_delete', 'admin', 'equipment', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_calendar_read', 'admin', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_calendar_write', 'admin', 'calendar', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_calendar_create', 'admin', 'calendar', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_calendar_edit', 'admin', 'calendar', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_calendar_delete', 'admin', 'calendar', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_users_read', 'admin', 'users', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_users_write', 'admin', 'users', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_users_create', 'admin', 'users', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_users_edit', 'admin', 'users', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_settings_read', 'admin', 'settings', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_settings_write', 'admin', 'settings', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_settings_create', 'admin', 'settings', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_settings_edit', 'admin', 'settings', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_audit_logs_read', 'admin', 'audit_logs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_moms_read', 'admin', 'moms', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_moms_write', 'admin', 'moms', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_moms_create', 'admin', 'moms', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_moms_edit', 'admin', 'moms', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_moms_delete', 'admin', 'moms', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_moms_export', 'admin', 'moms', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_moms_approve', 'admin', 'moms', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_requests_read', 'admin', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_requests_write', 'admin', 'requests', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_requests_create', 'admin', 'requests', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_requests_edit', 'admin', 'requests', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_requests_delete', 'admin', 'requests', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_requests_export', 'admin', 'requests', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_requests_assign', 'admin', 'requests', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_requests_approve', 'admin', 'requests', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_quotations_read', 'admin', 'quotations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_quotations_write', 'admin', 'quotations', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_quotations_create', 'admin', 'quotations', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_quotations_edit', 'admin', 'quotations', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_quotations_export', 'admin', 'quotations', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_employees_read', 'admin', 'employees', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_employees_write', 'admin', 'employees', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_employees_create', 'admin', 'employees', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_employees_edit', 'admin', 'employees', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_employees_assign', 'admin', 'employees', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_employees_export', 'admin', 'employees', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_employees_approve', 'admin', 'employees', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_benefits_read', 'admin', 'benefits', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_benefits_write', 'admin', 'benefits', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_benefits_create', 'admin', 'benefits', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_benefits_edit', 'admin', 'benefits', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_reports_read', 'admin', 'reports', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_reports_export', 'admin', 'reports', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_profile_changes_read', 'admin', 'profile_changes', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_profile_changes_approve', 'admin', 'profile_changes', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_self_service_read', 'admin', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_self_service_create', 'admin', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_it_support_read', 'admin', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_it_support_create', 'admin', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_it_support_edit', 'admin', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_social_read', 'admin', 'social', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_social_write', 'admin', 'social', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_social_create', 'admin', 'social', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_social_edit', 'admin', 'social', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_social_delete', 'admin', 'social', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_social_export', 'admin', 'social', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_assets_read', 'admin', 'assets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_assets_write', 'admin', 'assets', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_assets_create', 'admin', 'assets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_assets_edit', 'admin', 'assets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_assets_delete', 'admin', 'assets', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_assets_export', 'admin', 'assets', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_assets_approve', 'admin', 'assets', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_announcements_read', 'admin', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_announcements_write', 'admin', 'announcements', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_announcements_create', 'admin', 'announcements', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_announcements_edit', 'admin', 'announcements', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_announcements_delete', 'admin', 'announcements', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_announcements_export', 'admin', 'announcements', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_announcements_approve', 'admin', 'announcements', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_letters_read', 'admin', 'letters', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_letters_write', 'admin', 'letters', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_letters_create', 'admin', 'letters', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_letters_edit', 'admin', 'letters', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_letters_delete', 'admin', 'letters', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_letters_export', 'admin', 'letters', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_letters_approve', 'admin', 'letters', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_letters_issue_send', 'admin', 'letters', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_pages_read', 'admin', 'pages', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_pages_write', 'admin', 'pages', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_pages_create', 'admin', 'pages', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_pages_edit', 'admin', 'pages', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_pages_delete', 'admin', 'pages', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_articles_read', 'admin', 'articles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_articles_write', 'admin', 'articles', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_articles_create', 'admin', 'articles', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_articles_edit', 'admin', 'articles', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_articles_delete', 'admin', 'articles', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_articles_approve', 'admin', 'articles', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_cms_code_read', 'admin', 'cms_code', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_admin_cms_code_edit', 'admin', 'cms_code', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_tasks_read', 'finance_manager', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_tasks_write', 'finance_manager', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_tasks_create', 'finance_manager', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_tasks_edit', 'finance_manager', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_tasks_delete', 'finance_manager', 'tasks', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_tasks_export', 'finance_manager', 'tasks', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_tasks_assign', 'finance_manager', 'tasks', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_orders_read', 'finance_manager', 'orders', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_orders_export', 'finance_manager', 'orders', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_orders_approve', 'finance_manager', 'orders', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_procurement_read', 'finance_manager', 'procurement', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_procurement_write', 'finance_manager', 'procurement', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_procurement_create', 'finance_manager', 'procurement', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_procurement_edit', 'finance_manager', 'procurement', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_procurement_export', 'finance_manager', 'procurement', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_procurement_approve', 'finance_manager', 'procurement', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_inventory_read', 'finance_manager', 'inventory', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_inventory_export', 'finance_manager', 'inventory', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_inventory_approve', 'finance_manager', 'inventory', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_products_read', 'finance_manager', 'products', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_products_export', 'finance_manager', 'products', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_announcements_read', 'finance_manager', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_announcements_write', 'finance_manager', 'announcements', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_announcements_create', 'finance_manager', 'announcements', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_announcements_edit', 'finance_manager', 'announcements', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_letters_read', 'finance_manager', 'letters', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_invoices_read', 'finance_manager', 'invoices', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_invoices_write', 'finance_manager', 'invoices', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_invoices_create', 'finance_manager', 'invoices', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_invoices_edit', 'finance_manager', 'invoices', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_invoices_export', 'finance_manager', 'invoices', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payments_read', 'finance_manager', 'payments', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payments_write', 'finance_manager', 'payments', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payments_create', 'finance_manager', 'payments', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payments_edit', 'finance_manager', 'payments', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payments_export', 'finance_manager', 'payments', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_expenses_read', 'finance_manager', 'expenses', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_expenses_write', 'finance_manager', 'expenses', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_expenses_create', 'finance_manager', 'expenses', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_expenses_edit', 'finance_manager', 'expenses', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_expenses_export', 'finance_manager', 'expenses', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_expenses_approve', 'finance_manager', 'expenses', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_finance_analytics_read', 'finance_manager', 'finance_analytics', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_finance_analytics_export', 'finance_manager', 'finance_analytics', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_deals_read', 'finance_manager', 'deals', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_contacts_read', 'finance_manager', 'contacts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_contracts_read', 'finance_manager', 'contracts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_calendar_read', 'finance_manager', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_moms_read', 'finance_manager', 'moms', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_requests_read', 'finance_manager', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_requests_write', 'finance_manager', 'requests', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_requests_create', 'finance_manager', 'requests', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_requests_edit', 'finance_manager', 'requests', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_quotations_read', 'finance_manager', 'quotations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_quotations_write', 'finance_manager', 'quotations', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_quotations_create', 'finance_manager', 'quotations', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_quotations_edit', 'finance_manager', 'quotations', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_quotations_export', 'finance_manager', 'quotations', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_employees_read', 'finance_manager', 'employees', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payroll_read', 'finance_manager', 'payroll', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payroll_write', 'finance_manager', 'payroll', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payroll_create', 'finance_manager', 'payroll', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payroll_edit', 'finance_manager', 'payroll', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_payroll_issue_send', 'finance_manager', 'payroll', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_reports_read', 'finance_manager', 'reports', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_reports_export', 'finance_manager', 'reports', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_self_service_read', 'finance_manager', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_self_service_create', 'finance_manager', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_it_support_read', 'finance_manager', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_it_support_create', 'finance_manager', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_it_support_edit', 'finance_manager', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_assets_read', 'finance_manager', 'assets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_assets_export', 'finance_manager', 'assets', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_finance_manager_assets_approve', 'finance_manager', 'assets', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_tasks_read', 'accountant', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_tasks_write', 'accountant', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_tasks_create', 'accountant', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_tasks_edit', 'accountant', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_orders_read', 'accountant', 'orders', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_orders_export', 'accountant', 'orders', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_procurement_read', 'accountant', 'procurement', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_procurement_write', 'accountant', 'procurement', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_procurement_create', 'accountant', 'procurement', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_procurement_edit', 'accountant', 'procurement', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_procurement_export', 'accountant', 'procurement', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_inventory_read', 'accountant', 'inventory', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_inventory_export', 'accountant', 'inventory', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_products_read', 'accountant', 'products', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_announcements_read', 'accountant', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_invoices_read', 'accountant', 'invoices', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_invoices_write', 'accountant', 'invoices', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_invoices_create', 'accountant', 'invoices', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_invoices_edit', 'accountant', 'invoices', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_invoices_export', 'accountant', 'invoices', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_payments_read', 'accountant', 'payments', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_payments_write', 'accountant', 'payments', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_payments_create', 'accountant', 'payments', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_payments_edit', 'accountant', 'payments', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_payments_export', 'accountant', 'payments', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_expenses_read', 'accountant', 'expenses', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_expenses_write', 'accountant', 'expenses', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_expenses_create', 'accountant', 'expenses', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_expenses_edit', 'accountant', 'expenses', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_expenses_export', 'accountant', 'expenses', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_finance_analytics_read', 'accountant', 'finance_analytics', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_deals_read', 'accountant', 'deals', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_contacts_read', 'accountant', 'contacts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_contracts_read', 'accountant', 'contracts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_moms_read', 'accountant', 'moms', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_requests_read', 'accountant', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_quotations_read', 'accountant', 'quotations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_quotations_export', 'accountant', 'quotations', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_payroll_read', 'accountant', 'payroll', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_payroll_issue_send', 'accountant', 'payroll', 'issue_send', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_reports_read', 'accountant', 'reports', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_reports_export', 'accountant', 'reports', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_self_service_read', 'accountant', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_self_service_create', 'accountant', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_it_support_read', 'accountant', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_it_support_create', 'accountant', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_it_support_edit', 'accountant', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_accountant_assets_read', 'accountant', 'assets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_tasks_read', 'operations_manager', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_tasks_write', 'operations_manager', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_tasks_create', 'operations_manager', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_tasks_edit', 'operations_manager', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_tasks_delete', 'operations_manager', 'tasks', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_tasks_export', 'operations_manager', 'tasks', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_tasks_assign', 'operations_manager', 'tasks', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deliveries_read', 'operations_manager', 'deliveries', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deliveries_write', 'operations_manager', 'deliveries', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deliveries_create', 'operations_manager', 'deliveries', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deliveries_edit', 'operations_manager', 'deliveries', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deliveries_delete', 'operations_manager', 'deliveries', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deliveries_export', 'operations_manager', 'deliveries', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deliveries_assign', 'operations_manager', 'deliveries', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_orders_read', 'operations_manager', 'orders', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_orders_export', 'operations_manager', 'orders', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_procurement_read', 'operations_manager', 'procurement', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_procurement_create', 'operations_manager', 'procurement', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_procurement_export', 'operations_manager', 'procurement', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_procurement_approve', 'operations_manager', 'procurement', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_inventory_read', 'operations_manager', 'inventory', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_inventory_export', 'operations_manager', 'inventory', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_inventory_approve', 'operations_manager', 'inventory', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_products_read', 'operations_manager', 'products', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_announcements_read', 'operations_manager', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_announcements_write', 'operations_manager', 'announcements', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_announcements_create', 'operations_manager', 'announcements', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_announcements_edit', 'operations_manager', 'announcements', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deals_read', 'operations_manager', 'deals', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deals_write', 'operations_manager', 'deals', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deals_create', 'operations_manager', 'deals', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deals_edit', 'operations_manager', 'deals', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_deals_export', 'operations_manager', 'deals', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_contacts_read', 'operations_manager', 'contacts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_contacts_write', 'operations_manager', 'contacts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_contacts_create', 'operations_manager', 'contacts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_contacts_edit', 'operations_manager', 'contacts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_leads_read', 'operations_manager', 'leads', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_leads_write', 'operations_manager', 'leads', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_leads_create', 'operations_manager', 'leads', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_leads_edit', 'operations_manager', 'leads', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_contracts_read', 'operations_manager', 'contracts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_contracts_write', 'operations_manager', 'contracts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_contracts_create', 'operations_manager', 'contracts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_contracts_edit', 'operations_manager', 'contracts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_equipment_read', 'operations_manager', 'equipment', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_equipment_write', 'operations_manager', 'equipment', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_equipment_create', 'operations_manager', 'equipment', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_equipment_edit', 'operations_manager', 'equipment', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_moms_read', 'operations_manager', 'moms', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_moms_write', 'operations_manager', 'moms', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_moms_create', 'operations_manager', 'moms', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_moms_edit', 'operations_manager', 'moms', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_moms_export', 'operations_manager', 'moms', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_moms_approve', 'operations_manager', 'moms', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_requests_read', 'operations_manager', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_requests_write', 'operations_manager', 'requests', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_requests_create', 'operations_manager', 'requests', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_requests_edit', 'operations_manager', 'requests', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_requests_assign', 'operations_manager', 'requests', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_requests_approve', 'operations_manager', 'requests', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_calendar_read', 'operations_manager', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_calendar_write', 'operations_manager', 'calendar', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_calendar_create', 'operations_manager', 'calendar', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_calendar_edit', 'operations_manager', 'calendar', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_calendar_delete', 'operations_manager', 'calendar', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_portfolio_read', 'operations_manager', 'portfolio', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_invoices_read', 'operations_manager', 'invoices', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_quotations_read', 'operations_manager', 'quotations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_employees_read', 'operations_manager', 'employees', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_self_service_read', 'operations_manager', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_self_service_create', 'operations_manager', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_it_support_read', 'operations_manager', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_it_support_create', 'operations_manager', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_it_support_edit', 'operations_manager', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_assets_read', 'operations_manager', 'assets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_assets_write', 'operations_manager', 'assets', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_assets_create', 'operations_manager', 'assets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_operations_manager_assets_edit', 'operations_manager', 'assets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_tasks_read', 'project_lead', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_tasks_write', 'project_lead', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_tasks_create', 'project_lead', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_tasks_edit', 'project_lead', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_tasks_delete', 'project_lead', 'tasks', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_tasks_export', 'project_lead', 'tasks', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_tasks_assign', 'project_lead', 'tasks', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_announcements_read', 'project_lead', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_deals_read', 'project_lead', 'deals', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_deals_write', 'project_lead', 'deals', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_deals_create', 'project_lead', 'deals', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_deals_edit', 'project_lead', 'deals', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_contacts_read', 'project_lead', 'contacts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_contacts_write', 'project_lead', 'contacts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_contacts_create', 'project_lead', 'contacts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_contacts_edit', 'project_lead', 'contacts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_leads_read', 'project_lead', 'leads', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_leads_write', 'project_lead', 'leads', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_leads_create', 'project_lead', 'leads', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_leads_edit', 'project_lead', 'leads', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_contracts_read', 'project_lead', 'contracts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_equipment_read', 'project_lead', 'equipment', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_equipment_write', 'project_lead', 'equipment', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_equipment_create', 'project_lead', 'equipment', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_equipment_edit', 'project_lead', 'equipment', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_calendar_read', 'project_lead', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_calendar_write', 'project_lead', 'calendar', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_calendar_create', 'project_lead', 'calendar', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_calendar_edit', 'project_lead', 'calendar', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_portfolio_read', 'project_lead', 'portfolio', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_requests_read', 'project_lead', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_requests_write', 'project_lead', 'requests', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_requests_create', 'project_lead', 'requests', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_requests_edit', 'project_lead', 'requests', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_self_service_read', 'project_lead', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_self_service_create', 'project_lead', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_it_support_read', 'project_lead', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_it_support_create', 'project_lead', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_project_lead_it_support_edit', 'project_lead', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_tasks_read', 'sales', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_tasks_write', 'sales', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_tasks_create', 'sales', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_tasks_edit', 'sales', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_orders_read', 'sales', 'orders', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_orders_write', 'sales', 'orders', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_orders_create', 'sales', 'orders', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_orders_edit', 'sales', 'orders', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_inventory_read', 'sales', 'inventory', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_products_read', 'sales', 'products', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_announcements_read', 'sales', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_deals_read', 'sales', 'deals', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_deals_write', 'sales', 'deals', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_deals_create', 'sales', 'deals', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_deals_edit', 'sales', 'deals', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_deals_delete', 'sales', 'deals', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_deals_export', 'sales', 'deals', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contacts_read', 'sales', 'contacts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contacts_write', 'sales', 'contacts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contacts_create', 'sales', 'contacts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contacts_edit', 'sales', 'contacts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contacts_delete', 'sales', 'contacts', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contacts_export', 'sales', 'contacts', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_leads_read', 'sales', 'leads', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_leads_write', 'sales', 'leads', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_leads_create', 'sales', 'leads', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_leads_edit', 'sales', 'leads', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_leads_delete', 'sales', 'leads', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_leads_export', 'sales', 'leads', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contracts_read', 'sales', 'contracts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contracts_write', 'sales', 'contracts', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contracts_create', 'sales', 'contracts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_contracts_edit', 'sales', 'contracts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_calendar_read', 'sales', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_calendar_write', 'sales', 'calendar', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_calendar_create', 'sales', 'calendar', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_calendar_edit', 'sales', 'calendar', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_invoices_read', 'sales', 'invoices', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_quotations_read', 'sales', 'quotations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_quotations_write', 'sales', 'quotations', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_quotations_create', 'sales', 'quotations', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_quotations_edit', 'sales', 'quotations', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_quotations_export', 'sales', 'quotations', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_requests_read', 'sales', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_requests_write', 'sales', 'requests', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_requests_create', 'sales', 'requests', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_requests_edit', 'sales', 'requests', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_self_service_read', 'sales', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_self_service_create', 'sales', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_it_support_read', 'sales', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_it_support_create', 'sales', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_sales_it_support_edit', 'sales', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_marketing_read', 'marketing', 'marketing', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_marketing_write', 'marketing', 'marketing', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_marketing_create', 'marketing', 'marketing', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_marketing_edit', 'marketing', 'marketing', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_marketing_delete', 'marketing', 'marketing', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_marketing_export', 'marketing', 'marketing', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_press_read', 'marketing', 'press', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_tasks_read', 'marketing', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_tasks_write', 'marketing', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_tasks_create', 'marketing', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_tasks_edit', 'marketing', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_products_read', 'marketing', 'products', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_pages_read', 'marketing', 'pages', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_pages_write', 'marketing', 'pages', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_pages_create', 'marketing', 'pages', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_pages_edit', 'marketing', 'pages', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_articles_read', 'marketing', 'articles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_articles_write', 'marketing', 'articles', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_articles_create', 'marketing', 'articles', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_articles_edit', 'marketing', 'articles', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_articles_delete', 'marketing', 'articles', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_articles_approve', 'marketing', 'articles', 'approve', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_announcements_read', 'marketing', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_banners_read', 'marketing', 'banners', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_banners_write', 'marketing', 'banners', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_banners_create', 'marketing', 'banners', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_banners_edit', 'marketing', 'banners', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_banners_delete', 'marketing', 'banners', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_portfolio_read', 'marketing', 'portfolio', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_portfolio_write', 'marketing', 'portfolio', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_portfolio_create', 'marketing', 'portfolio', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_portfolio_edit', 'marketing', 'portfolio', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_portfolio_delete', 'marketing', 'portfolio', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_clients_read', 'marketing', 'clients', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_clients_write', 'marketing', 'clients', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_clients_create', 'marketing', 'clients', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_clients_edit', 'marketing', 'clients', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_clients_delete', 'marketing', 'clients', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_leads_read', 'marketing', 'leads', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_leads_write', 'marketing', 'leads', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_leads_create', 'marketing', 'leads', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_leads_edit', 'marketing', 'leads', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_calendar_read', 'marketing', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_calendar_write', 'marketing', 'calendar', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_calendar_create', 'marketing', 'calendar', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_calendar_edit', 'marketing', 'calendar', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_equipment_read', 'marketing', 'equipment', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_requests_read', 'marketing', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_requests_write', 'marketing', 'requests', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_requests_create', 'marketing', 'requests', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_requests_edit', 'marketing', 'requests', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_self_service_read', 'marketing', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_self_service_create', 'marketing', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_it_support_read', 'marketing', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_it_support_create', 'marketing', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_it_support_edit', 'marketing', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_social_read', 'marketing', 'social', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_social_write', 'marketing', 'social', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_social_create', 'marketing', 'social', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_social_edit', 'marketing', 'social', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_social_delete', 'marketing', 'social', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_marketing_social_export', 'marketing', 'social', 'export', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_press_read', 'editor', 'press', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_tasks_read', 'editor', 'tasks', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_tasks_write', 'editor', 'tasks', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_tasks_create', 'editor', 'tasks', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_tasks_edit', 'editor', 'tasks', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_pages_read', 'editor', 'pages', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_pages_write', 'editor', 'pages', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_pages_create', 'editor', 'pages', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_pages_edit', 'editor', 'pages', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_articles_read', 'editor', 'articles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_articles_write', 'editor', 'articles', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_articles_create', 'editor', 'articles', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_articles_edit', 'editor', 'articles', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_announcements_read', 'editor', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_portfolio_read', 'editor', 'portfolio', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_portfolio_write', 'editor', 'portfolio', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_portfolio_create', 'editor', 'portfolio', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_portfolio_edit', 'editor', 'portfolio', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_banners_read', 'editor', 'banners', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_banners_write', 'editor', 'banners', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_banners_create', 'editor', 'banners', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_banners_edit', 'editor', 'banners', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_faqs_read', 'editor', 'faqs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_faqs_write', 'editor', 'faqs', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_faqs_create', 'editor', 'faqs', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_faqs_edit', 'editor', 'faqs', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_stats_read', 'editor', 'stats', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_stats_write', 'editor', 'stats', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_stats_create', 'editor', 'stats', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_stats_edit', 'editor', 'stats', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_clients_read', 'editor', 'clients', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_clients_write', 'editor', 'clients', 'write', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_clients_create', 'editor', 'clients', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_clients_edit', 'editor', 'clients', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_reviews_read', 'editor', 'reviews', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_equipment_read', 'editor', 'equipment', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_calendar_read', 'editor', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_requests_read', 'editor', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_self_service_read', 'editor', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_self_service_create', 'editor', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_it_support_read', 'editor', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_it_support_create', 'editor', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_editor_it_support_edit', 'editor', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_announcements_read', 'viewer', 'announcements', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_deals_read', 'viewer', 'deals', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_contacts_read', 'viewer', 'contacts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_leads_read', 'viewer', 'leads', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_portfolio_read', 'viewer', 'portfolio', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_clients_read', 'viewer', 'clients', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_equipment_read', 'viewer', 'equipment', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_calendar_read', 'viewer', 'calendar', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_requests_read', 'viewer', 'requests', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_self_service_read', 'viewer', 'self_service', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_self_service_create', 'viewer', 'self_service', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_it_support_read', 'viewer', 'it_support', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_it_support_create', 'viewer', 'it_support', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES ('stfperm_viewer_it_support_edit', 'viewer', 'it_support', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_system_health_read', 'it_admin', 'system_health', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_logs_read', 'it_admin', 'logs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_runtime_config_read', 'it_admin', 'runtime_config', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_runtime_config_edit', 'it_admin', 'runtime_config', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_jobs_read', 'it_admin', 'jobs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_jobs_execute', 'it_admin', 'jobs', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_database_read', 'it_admin', 'database', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_integrations_read', 'it_admin', 'integrations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_integrations_create', 'it_admin', 'integrations', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_integrations_edit', 'it_admin', 'integrations', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_integrations_delete', 'it_admin', 'integrations', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_integrations_execute', 'it_admin', 'integrations', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_domains_read', 'it_admin', 'domains', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_domains_create', 'it_admin', 'domains', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_domains_edit', 'it_admin', 'domains', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_domains_delete', 'it_admin', 'domains', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_domains_execute', 'it_admin', 'domains', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_site_code_read', 'it_admin', 'site_code', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_site_code_edit', 'it_admin', 'site_code', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_modules_read', 'it_admin', 'modules', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_modules_edit', 'it_admin', 'modules', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_accounts_read', 'it_admin', 'staff_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_accounts_create', 'it_admin', 'staff_accounts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_accounts_edit', 'it_admin', 'staff_accounts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_accounts_delete', 'it_admin', 'staff_accounts', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_accounts_execute', 'it_admin', 'staff_accounts', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_roles_read', 'it_admin', 'staff_roles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_roles_create', 'it_admin', 'staff_roles', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_roles_edit', 'it_admin', 'staff_roles', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_staff_roles_delete', 'it_admin', 'staff_roles', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_audit_read', 'it_admin', 'audit', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_notifications_read', 'it_admin', 'notifications', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_notifications_execute', 'it_admin', 'notifications', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_sessions_read', 'it_admin', 'sessions', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_sessions_delete', 'it_admin', 'sessions', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_setup_read', 'it_admin', 'setup', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_setup_edit', 'it_admin', 'setup', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_setup_execute', 'it_admin', 'setup', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_tickets_read', 'it_admin', 'tickets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_tickets_create', 'it_admin', 'tickets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_tickets_edit', 'it_admin', 'tickets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_tickets_assign', 'it_admin', 'tickets', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_tickets_delete', 'it_admin', 'tickets', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_ticket_settings_read', 'it_admin', 'ticket_settings', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_ticket_settings_edit', 'it_admin', 'ticket_settings', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_it_accounts_read', 'it_admin', 'it_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_it_accounts_create', 'it_admin', 'it_accounts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_it_accounts_edit', 'it_admin', 'it_accounts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_it_accounts_delete', 'it_admin', 'it_accounts', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_api_keys_read', 'it_admin', 'api_keys', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_api_keys_create', 'it_admin', 'api_keys', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_api_keys_delete', 'it_admin', 'api_keys', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_backups_read', 'it_admin', 'backups', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_admin_backups_execute', 'it_admin', 'backups', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_system_health_read', 'it_manager', 'system_health', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_logs_read', 'it_manager', 'logs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_runtime_config_read', 'it_manager', 'runtime_config', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_runtime_config_edit', 'it_manager', 'runtime_config', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_jobs_read', 'it_manager', 'jobs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_jobs_execute', 'it_manager', 'jobs', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_database_read', 'it_manager', 'database', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_integrations_read', 'it_manager', 'integrations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_integrations_create', 'it_manager', 'integrations', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_integrations_edit', 'it_manager', 'integrations', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_integrations_execute', 'it_manager', 'integrations', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_domains_read', 'it_manager', 'domains', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_domains_create', 'it_manager', 'domains', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_domains_edit', 'it_manager', 'domains', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_domains_execute', 'it_manager', 'domains', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_site_code_read', 'it_manager', 'site_code', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_site_code_edit', 'it_manager', 'site_code', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_modules_read', 'it_manager', 'modules', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_modules_edit', 'it_manager', 'modules', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_staff_accounts_read', 'it_manager', 'staff_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_staff_accounts_create', 'it_manager', 'staff_accounts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_staff_accounts_edit', 'it_manager', 'staff_accounts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_staff_accounts_execute', 'it_manager', 'staff_accounts', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_staff_roles_read', 'it_manager', 'staff_roles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_staff_roles_create', 'it_manager', 'staff_roles', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_staff_roles_edit', 'it_manager', 'staff_roles', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_audit_read', 'it_manager', 'audit', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_notifications_read', 'it_manager', 'notifications', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_notifications_execute', 'it_manager', 'notifications', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_sessions_read', 'it_manager', 'sessions', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_sessions_delete', 'it_manager', 'sessions', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_setup_read', 'it_manager', 'setup', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_setup_edit', 'it_manager', 'setup', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_tickets_read', 'it_manager', 'tickets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_tickets_create', 'it_manager', 'tickets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_tickets_edit', 'it_manager', 'tickets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_tickets_assign', 'it_manager', 'tickets', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_tickets_delete', 'it_manager', 'tickets', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_ticket_settings_read', 'it_manager', 'ticket_settings', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_ticket_settings_edit', 'it_manager', 'ticket_settings', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_it_accounts_read', 'it_manager', 'it_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_it_accounts_create', 'it_manager', 'it_accounts', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_it_accounts_edit', 'it_manager', 'it_accounts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_api_keys_read', 'it_manager', 'api_keys', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_api_keys_create', 'it_manager', 'api_keys', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_backups_read', 'it_manager', 'backups', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_manager_backups_execute', 'it_manager', 'backups', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_system_health_read', 'it_lead', 'system_health', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_logs_read', 'it_lead', 'logs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_runtime_config_read', 'it_lead', 'runtime_config', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_runtime_config_edit', 'it_lead', 'runtime_config', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_jobs_read', 'it_lead', 'jobs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_jobs_execute', 'it_lead', 'jobs', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_database_read', 'it_lead', 'database', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_integrations_read', 'it_lead', 'integrations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_integrations_edit', 'it_lead', 'integrations', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_integrations_execute', 'it_lead', 'integrations', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_domains_read', 'it_lead', 'domains', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_domains_edit', 'it_lead', 'domains', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_domains_execute', 'it_lead', 'domains', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_site_code_read', 'it_lead', 'site_code', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_site_code_edit', 'it_lead', 'site_code', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_modules_read', 'it_lead', 'modules', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_staff_accounts_read', 'it_lead', 'staff_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_staff_roles_read', 'it_lead', 'staff_roles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_audit_read', 'it_lead', 'audit', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_notifications_read', 'it_lead', 'notifications', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_notifications_execute', 'it_lead', 'notifications', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_sessions_read', 'it_lead', 'sessions', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_tickets_read', 'it_lead', 'tickets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_tickets_create', 'it_lead', 'tickets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_tickets_edit', 'it_lead', 'tickets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_tickets_assign', 'it_lead', 'tickets', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_ticket_settings_read', 'it_lead', 'ticket_settings', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_ticket_settings_edit', 'it_lead', 'ticket_settings', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_it_accounts_read', 'it_lead', 'it_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_it_accounts_edit', 'it_lead', 'it_accounts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_api_keys_read', 'it_lead', 'api_keys', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_lead_backups_read', 'it_lead', 'backups', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_system_health_read', 'it_engineer', 'system_health', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_logs_read', 'it_engineer', 'logs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_runtime_config_read', 'it_engineer', 'runtime_config', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_runtime_config_edit', 'it_engineer', 'runtime_config', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_jobs_read', 'it_engineer', 'jobs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_jobs_execute', 'it_engineer', 'jobs', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_database_read', 'it_engineer', 'database', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_integrations_read', 'it_engineer', 'integrations', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_integrations_edit', 'it_engineer', 'integrations', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_integrations_execute', 'it_engineer', 'integrations', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_domains_read', 'it_engineer', 'domains', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_domains_edit', 'it_engineer', 'domains', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_domains_execute', 'it_engineer', 'domains', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_site_code_read', 'it_engineer', 'site_code', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_site_code_edit', 'it_engineer', 'site_code', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_modules_read', 'it_engineer', 'modules', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_staff_accounts_read', 'it_engineer', 'staff_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_staff_roles_read', 'it_engineer', 'staff_roles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_audit_read', 'it_engineer', 'audit', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_notifications_read', 'it_engineer', 'notifications', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_notifications_execute', 'it_engineer', 'notifications', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_sessions_read', 'it_engineer', 'sessions', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_tickets_read', 'it_engineer', 'tickets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_tickets_create', 'it_engineer', 'tickets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_tickets_edit', 'it_engineer', 'tickets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_tickets_assign', 'it_engineer', 'tickets', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_ticket_settings_read', 'it_engineer', 'ticket_settings', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_engineer_backups_read', 'it_engineer', 'backups', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_system_health_read', 'it_worker', 'system_health', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_logs_read', 'it_worker', 'logs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_jobs_read', 'it_worker', 'jobs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_jobs_execute', 'it_worker', 'jobs', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_database_read', 'it_worker', 'database', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_notifications_read', 'it_worker', 'notifications', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_sessions_read', 'it_worker', 'sessions', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_tickets_read', 'it_worker', 'tickets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_tickets_create', 'it_worker', 'tickets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_tickets_edit', 'it_worker', 'tickets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_tickets_assign', 'it_worker', 'tickets', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_worker_ticket_settings_read', 'it_worker', 'ticket_settings', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_system_health_read', 'it_support', 'system_health', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_notifications_read', 'it_support', 'notifications', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_staff_accounts_read', 'it_support', 'staff_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_staff_accounts_edit', 'it_support', 'staff_accounts', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_staff_accounts_execute', 'it_support', 'staff_accounts', 'execute', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_staff_roles_read', 'it_support', 'staff_roles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_sessions_read', 'it_support', 'sessions', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_sessions_delete', 'it_support', 'sessions', 'delete', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_tickets_read', 'it_support', 'tickets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_tickets_create', 'it_support', 'tickets', 'create', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_tickets_edit', 'it_support', 'tickets', 'edit', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_tickets_assign', 'it_support', 'tickets', 'assign', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_support_ticket_settings_read', 'it_support', 'ticket_settings', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_auditor_system_health_read', 'it_auditor', 'system_health', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_auditor_logs_read', 'it_auditor', 'logs', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_auditor_audit_read', 'it_auditor', 'audit', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_auditor_sessions_read', 'it_auditor', 'sessions', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_auditor_staff_accounts_read', 'it_auditor', 'staff_accounts', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_auditor_staff_roles_read', 'it_auditor', 'staff_roles', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES ('itperm_it_auditor_tickets_read', 'it_auditor', 'tickets', 'read', true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'sami-khoury', 'sales@example.com', 'SK0009', '$argon2id$v=19$m=19456,t=2,p=1$mSbMeSezKloR2+1pqltwMA$3jQM9u6DzMnfPMgylalPh11Yk5wllf1bxwe/MoUQCmQ', '{"sales"}', true, false, 'karim-fawzi', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'hana-yousef', 'marketing@example.com', 'HY0010', '$argon2id$v=19$m=19456,t=2,p=1$agm6jJxmmZXY+r/xoK9EUQ$hGUkusIA7NVuvBgjDT1eJGO9ZyqHP/XO/Y9xFFa+8Bg', '{"marketing"}', true, false, 'karim-fawzi', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'c91cb10d-a43c-4983-baed-b95ad8de76b2', 'dgdfg@mail.com', NULL, NULL, '{"operations_manager"}', true, false, NULL, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('it', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', 'IT0001', '$argon2id$v=19$m=19456,t=2,p=1$GmEkIDiHNtqMSGZHMxrYcA$2qeUv1LyB9nTE1XRUU8G8jURidJ56ILWukLHxs16tR8', '{"it_admin"}', true, false, NULL, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('it', 'it-manager-001', 'it-manager@example.com', 'IT0002', '$argon2id$v=19$m=19456,t=2,p=1$GmEkIDiHNtqMSGZHMxrYcA$2qeUv1LyB9nTE1XRUU8G8jURidJ56ILWukLHxs16tR8', '{"it_manager"}', true, false, '430c4105-6360-4415-bf1b-087d582c7fc6', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('it', 'it-lead-001', 'it-lead@example.com', 'IT0003', '$argon2id$v=19$m=19456,t=2,p=1$GmEkIDiHNtqMSGZHMxrYcA$2qeUv1LyB9nTE1XRUU8G8jURidJ56ILWukLHxs16tR8', '{"it_lead"}', true, false, 'it-manager-001', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('it', 'it-eng-001', 'it-engineer@example.com', 'IT0004', '$argon2id$v=19$m=19456,t=2,p=1$GmEkIDiHNtqMSGZHMxrYcA$2qeUv1LyB9nTE1XRUU8G8jURidJ56ILWukLHxs16tR8', '{"it_engineer"}', true, false, 'it-lead-001', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('it', 'it-work-001', 'it-worker@example.com', 'IT0005', '$argon2id$v=19$m=19456,t=2,p=1$GmEkIDiHNtqMSGZHMxrYcA$2qeUv1LyB9nTE1XRUU8G8jURidJ56ILWukLHxs16tR8', '{"it_worker"}', true, false, 'it-lead-001', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('it', 'it-supp-001', 'it-support@example.com', 'IT0006', '$argon2id$v=19$m=19456,t=2,p=1$GmEkIDiHNtqMSGZHMxrYcA$2qeUv1LyB9nTE1XRUU8G8jURidJ56ILWukLHxs16tR8', '{"it_support"}', true, false, 'it-lead-001', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('it', 'it-audit-001', 'it-auditor@example.com', 'IT0007', '$argon2id$v=19$m=19456,t=2,p=1$GmEkIDiHNtqMSGZHMxrYcA$2qeUv1LyB9nTE1XRUU8G8jURidJ56ILWukLHxs16tR8', '{"it_auditor"}', true, false, 'it-manager-001', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'super-admin', 'admin@example.com', 'BA0001', '$argon2id$v=19$m=19456,t=2,p=1$xwMGv9Jm36oj/McrASNKuQ$nNvlNRWyXpVmA1gEnFCptjFGEhiIU0CBs5RPim+IZMg', '{"super_admin"}', true, false, NULL, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'omar-haddad', 'omar-haddad@example.com', 'OH0002', '$argon2id$v=19$m=19456,t=2,p=1$gfqeZ9CupfsdShN9TJq8VQ$t8dV/7Jhhr3hULEu8D5ATaITqN+ILLu34Kh55T5fPbM', '{"super_admin"}', true, false, 'super-admin', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'yusuf-rahman', 'director@example.com', 'YR0003', '$argon2id$v=19$m=19456,t=2,p=1$AEADNvnMM/shq/R6f7nlGQ$i9uupG4/DzvTidEgt7g0wnpELR8M3QlGQeUg13xaGj0', '{"admin"}', true, false, 'super-admin', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'layla-nasser', 'finance@example.com', 'LN0004', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"finance_manager"}', true, false, 'yusuf-rahman', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'karim-fawzi', 'production@example.com', 'KF0005', '$argon2id$v=19$m=19456,t=2,p=1$4uiNDvgDdHMkhUZHTVjgng$8t77aonOfHW1pGw4PQaup0Ct+MIzqXRhmDIXiiVu1Tw', '{"operations_manager"}', true, false, 'yusuf-rahman', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'tariq-saleh', 'producer@example.com', 'TS0006', '$argon2id$v=19$m=19456,t=2,p=1$T08lwxwNbNW1RHcmwMj37A$PX3L8D5Yblz42OMVZbMBr+IMBQJAoBCWqCn7XC5YZ6c', '{"project_lead"}', true, false, 'karim-fawzi', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'noor-hamdan', 'editor@example.com', 'NH0007', '$argon2id$v=19$m=19456,t=2,p=1$y4UqK8JHeCseWAVft3x1BQ$CYZ1S/5KATQJBCn5PytMDegtXaAyREgMAg2XpiS4ogQ', '{"editor"}', true, false, 'tariq-saleh', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'faisal-mansour', 'accountant@example.com', 'FM0008', '$argon2id$v=19$m=19456,t=2,p=1$O+stBWvZlrKljxz1CD7PmQ$pLJX+x+OwgbV1aP7zJzWjwBwCFgp5b2+tensIgjhNe0', '{"accountant"}', true, false, 'layla-nasser', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES ('staff', 'guest', 'guest@example.com', 'GO0011', '$argon2id$v=19$m=19456,t=2,p=1$PzVq/hrVrqoB/nVDhs8hpA$1rtDEGazyISd32w3oJU34XDSt6eV0gaZpYoNTzIfKUg', '{"viewer"}', true, false, 'yusuf-rahman', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'super-admin', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'omar-haddad', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'yusuf-rahman', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'layla-nasser', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'karim-fawzi', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'tariq-saleh', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'noor-hamdan', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'faisal-mansour', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'sami-khoury', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'hana-yousef', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'guest', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;
INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'c91cb10d-a43c-4983-baed-b95ad8de76b2', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. HR SERVICE (Departments, Employees, Payroll Runs, Leaves, Attendance)
-- ----------------------------------------------------------------------------
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('920539be-a979-42c1-bb53-a90ea0005289', 'EXEC', 'Executive', 'الإدارة التنفيذية') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('7754f827-b81d-4198-b382-cd5c6afbb561', 'FIN', 'Finance', 'المالية') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('942af868-b755-4460-8930-01492e6ae65b', 'PROD', 'Production', 'الإنتاج') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('34db5948-6e7c-45dd-b290-6c2be78040e4', 'SALES', 'Sales & Marketing', 'المبيعات والتسويق') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000005', 'LOG', 'Logistics & Fleet', 'الخدمات اللوجستية والأسطول') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000006', 'POST', 'Post-Production & Grading', 'ما بعد الإنتاج والمونتاج') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000005', 'LOG', 'Logistics & Fleet', 'الخدمات اللوجستية والأسطول') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000006', 'POST', 'Post-Production & Grading', 'ما بعد الإنتاج والمونتاج') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('04c696d7-f5e1-408c-8723-205b567d6119', 'OH0002', 'Omar', 'Haddad', 'عمر', 'حداد', 'omar-haddad@example.com', '+97317000000', 'Chief Executive Officer', 'الرئيس التنفيذي / مدير عام', '920539be-a979-42c1-bb53-a90ea0005289', NULL, (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1200, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('519c98db-889e-4b93-ba19-0015bde5a465', 'YR0003', 'Yusuf', 'Rahman', 'يوسف', 'رحمن', 'director@example.com', '+97336002200', 'Managing Director', 'مدير العمليات العامة', '920539be-a979-42c1-bb53-a90ea0005289', '04c696d7-f5e1-408c-8723-205b567d6119', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1300, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('71190c9f-71eb-41a5-8636-7f2ad6960be8', 'LN0004', 'Layla', 'Nasser', 'ليلى', 'ناصر', 'finance@example.com', '+97336003300', 'Finance Manager', 'مدير المالية والمحاسبة', '7754f827-b81d-4198-b382-cd5c6afbb561', '519c98db-889e-4b93-ba19-0015bde5a465', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1400, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'KF0005', 'Karim', 'Fawzi', 'كريم', 'فوزي', 'production@example.com', '+97336004400', 'Head of Production', 'مدير إدارة الإنتاج السينمائي', '942af868-b755-4460-8930-01492e6ae65b', '519c98db-889e-4b93-ba19-0015bde5a465', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1500, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('67a177f9-65e6-4e40-b0a9-f1168e276326', 'SK0009', 'Sami', 'Khoury', 'سامي', 'خوري', 'sales@example.com', '+97336008811', 'Sales & Business Development Manager', 'مدير تطوير الأعمال والمبيعات', '34db5948-6e7c-45dd-b290-6c2be78040e4', '519c98db-889e-4b93-ba19-0015bde5a465', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1900, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('3b06b26b-5eb5-4395-837e-4e24d0a148de', 'HY0010', 'Hana', 'Yousef', 'هناء', 'يوسف', 'marketing@example.com', '+97336008822', 'Marketing & PR Specialist', 'أخصائي التسويق والعلاقات العامة', '34db5948-6e7c-45dd-b290-6c2be78040e4', '519c98db-889e-4b93-ba19-0015bde5a465', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 2000, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('3e911960-0003-4981-ac1a-8085dd66a212', 'GO0011', 'Guest', 'Observer', 'مراقب', 'عام', 'guest@example.com', '+97336008800', 'Guest Observer', 'مراقب خارجي معتمد', '942af868-b755-4460-8930-01492e6ae65b', '519c98db-889e-4b93-ba19-0015bde5a465', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 2100, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 'FM0008', 'Faisal', 'Mansour', 'فيصل', 'منصور', 'accountant@example.com', '+97336007700', 'Senior Accountant', 'محاسب مالي أول', '7754f827-b81d-4198-b382-cd5c6afbb561', '71190c9f-71eb-41a5-8636-7f2ad6960be8', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1800, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 'TS0006', 'Tariq', 'Saleh', 'طارق', 'صالح', 'producer@example.com', '+97336005500', 'Lead Producer', 'منتج رئيسي / مدير مشاريع', '942af868-b755-4460-8930-01492e6ae65b', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1600, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 'NH0007', 'Noor', 'Hamdan', 'نور', 'حمدان', 'editor@example.com', '+97336006600', 'Senior Editor & Colorist', 'محرر ومونتير سينمائي أول', '942af868-b755-4460-8930-01492e6ae65b', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1700, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_run (id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at)
VALUES ('pr-2026-07', 7, 2026, 'completed', 14500.000, 750.000, 13750.000, 'BHD', (CURRENT_DATE - INTERVAL '105 days')::timestamptz, 'super-admin', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_run (id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at)
VALUES ('pr-2026-08', 8, 2026, 'completed', 14500.000, 750.000, 13750.000, 'BHD', (CURRENT_DATE - INTERVAL '75 days')::timestamptz, 'super-admin', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_run (id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at)
VALUES ('pr-2026-09', 9, 2026, 'completed', 14500.000, 750.000, 13750.000, 'BHD', (CURRENT_DATE - INTERVAL '45 days')::timestamptz, 'super-admin', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_run (id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at)
VALUES ('pr-2026-10', 10, 2026, 'completed', 14500.000, 750.000, 13750.000, 'BHD', (CURRENT_DATE - INTERVAL '15 days')::timestamptz, 'super-admin', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-001', 'pr-2026-07', '04c696d7-f5e1-408c-8723-205b567d6119', 1200, 325, 84, 1441, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-002', 'pr-2026-07', '519c98db-889e-4b93-ba19-0015bde5a465', 1300, 325, 91, 1534, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-003', 'pr-2026-07', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 1400, 325, 98, 1627, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-004', 'pr-2026-07', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 1500, 325, 105, 1720, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-005', 'pr-2026-07', '67a177f9-65e6-4e40-b0a9-f1168e276326', 1900, 325, 133, 2092, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-006', 'pr-2026-07', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 2000, 325, 140, 2185, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-007', 'pr-2026-07', '3e911960-0003-4981-ac1a-8085dd66a212', 2100, 325, 147, 2278, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-008', 'pr-2026-07', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 1800, 325, 126, 1999, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-009', 'pr-2026-07', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 1600, 325, 112, 1813, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-010', 'pr-2026-07', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 1700, 325, 119, 1906, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-011', 'pr-2026-08', '04c696d7-f5e1-408c-8723-205b567d6119', 1200, 325, 84, 1441, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-012', 'pr-2026-08', '519c98db-889e-4b93-ba19-0015bde5a465', 1300, 325, 91, 1534, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-013', 'pr-2026-08', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 1400, 325, 98, 1627, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-014', 'pr-2026-08', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 1500, 325, 105, 1720, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-015', 'pr-2026-08', '67a177f9-65e6-4e40-b0a9-f1168e276326', 1900, 325, 133, 2092, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-016', 'pr-2026-08', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 2000, 325, 140, 2185, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-017', 'pr-2026-08', '3e911960-0003-4981-ac1a-8085dd66a212', 2100, 325, 147, 2278, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-018', 'pr-2026-08', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 1800, 325, 126, 1999, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-019', 'pr-2026-08', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 1600, 325, 112, 1813, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-020', 'pr-2026-08', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 1700, 325, 119, 1906, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-021', 'pr-2026-09', '04c696d7-f5e1-408c-8723-205b567d6119', 1200, 325, 84, 1441, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-022', 'pr-2026-09', '519c98db-889e-4b93-ba19-0015bde5a465', 1300, 325, 91, 1534, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-023', 'pr-2026-09', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 1400, 325, 98, 1627, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-024', 'pr-2026-09', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 1500, 325, 105, 1720, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-025', 'pr-2026-09', '67a177f9-65e6-4e40-b0a9-f1168e276326', 1900, 325, 133, 2092, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-026', 'pr-2026-09', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 2000, 325, 140, 2185, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-027', 'pr-2026-09', '3e911960-0003-4981-ac1a-8085dd66a212', 2100, 325, 147, 2278, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-028', 'pr-2026-09', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 1800, 325, 126, 1999, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-029', 'pr-2026-09', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 1600, 325, 112, 1813, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-030', 'pr-2026-09', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 1700, 325, 119, 1906, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-031', 'pr-2026-10', '04c696d7-f5e1-408c-8723-205b567d6119', 1200, 325, 84, 1441, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-032', 'pr-2026-10', '519c98db-889e-4b93-ba19-0015bde5a465', 1300, 325, 91, 1534, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-033', 'pr-2026-10', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 1400, 325, 98, 1627, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-034', 'pr-2026-10', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 1500, 325, 105, 1720, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-035', 'pr-2026-10', '67a177f9-65e6-4e40-b0a9-f1168e276326', 1900, 325, 133, 2092, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-036', 'pr-2026-10', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 2000, 325, 140, 2185, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-037', 'pr-2026-10', '3e911960-0003-4981-ac1a-8085dd66a212', 2100, 325, 147, 2278, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-038', 'pr-2026-10', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 1800, 325, 126, 1999, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-039', 'pr-2026-10', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 1600, 325, 112, 1813, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)
VALUES ('pi-040', 'pr-2026-10', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 1700, 325, 119, 1906, 'paid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-001', '04c696d7-f5e1-408c-8723-205b567d6119', 'annual', (CURRENT_DATE - INTERVAL '140 days')::date, (CURRENT_DATE - INTERVAL '135 days')::date, 5, 'approved', 'Annual leave family vacation', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-002', '519c98db-889e-4b93-ba19-0015bde5a465', 'sick', (CURRENT_DATE - INTERVAL '115 days')::date, (CURRENT_DATE - INTERVAL '114 days')::date, 2, 'approved', 'Medical recovery with hospital certificate', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-003', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 'annual', (CURRENT_DATE - INTERVAL '95 days')::date, (CURRENT_DATE - INTERVAL '92 days')::date, 4, 'approved', 'Travel for documentary film screening', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-004', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'emergency', (CURRENT_DATE - INTERVAL '80 days')::date, (CURRENT_DATE - INTERVAL '80 days')::date, 1, 'approved', 'Family urgent matter', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-005', '67a177f9-65e6-4e40-b0a9-f1168e276326', 'annual', (CURRENT_DATE - INTERVAL '65 days')::date, (CURRENT_DATE - INTERVAL '60 days')::date, 6, 'approved', 'Post-production wrap vacation', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-006', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 'sick', (CURRENT_DATE - INTERVAL '45 days')::date, (CURRENT_DATE - INTERVAL '43 days')::date, 3, 'approved', 'Flu recovery', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-007', '3e911960-0003-4981-ac1a-8085dd66a212', 'annual', (CURRENT_DATE - INTERVAL '30 days')::date, (CURRENT_DATE - INTERVAL '26 days')::date, 5, 'approved', 'Personal travel', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-008', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 'annual', (CURRENT_DATE - INTERVAL '15 days')::date, (CURRENT_DATE - INTERVAL '12 days')::date, 4, 'approved', 'Annual holiday', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-009', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 'annual', (CURRENT_DATE - INTERVAL '-10 days')::date, (CURRENT_DATE - INTERVAL '-15 days')::date, 5, 'pending', 'Planned upcoming winter vacation', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)
VALUES ('lr-010', '519c98db-889e-4b93-ba19-0015bde5a465', 'annual', (CURRENT_DATE - INTERVAL '-5 days')::date, (CURRENT_DATE - INTERVAL '-7 days')::date, 3, 'pending', 'Personal leaves', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-04c696d7-f5e1-408c-8723-205b567d6119-today', '04c696d7-f5e1-408c-8723-205b567d6119', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-519c98db-889e-4b93-ba19-0015bde5a465-today', '519c98db-889e-4b93-ba19-0015bde5a465', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-71190c9f-71eb-41a5-8636-7f2ad6960be8-today', '71190c9f-71eb-41a5-8636-7f2ad6960be8', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744-today', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-67a177f9-65e6-4e40-b0a9-f1168e276326-today', '67a177f9-65e6-4e40-b0a9-f1168e276326', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-3b06b26b-5eb5-4395-837e-4e24d0a148de-today', '3b06b26b-5eb5-4395-837e-4e24d0a148de', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-3e911960-0003-4981-ac1a-8085dd66a212-today', '3e911960-0003-4981-ac1a-8085dd66a212', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-17fcd4f9-6dbd-491e-a392-cc3a9a42f277-today', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75-today', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)
VALUES ('att-c1947ad8-900f-419f-a0e2-3f2afe3d1bda-today', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. SALES SERVICE (Contacts, Deals across all stages, Quotations, Inquiries)
-- ----------------------------------------------------------------------------
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-001', 'Jasim', 'Al-Shirawi', 'j.shirawi@bic.com.bh', '+97339001101', 'Bahrain International Circuit (BIC)', 'client', 'active', 'Primary media production & creative liaison for Bahrain International Circuit (BIC).', '{"f1","motorsport","sports"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-002', 'Tariq', 'Al-Moayyed', 't.moayyed@falconair.com', '+97339001102', 'Falcon Airways', 'client', 'active', 'Primary media production & creative liaison for Falcon Airways.', '{"aviation","commercial","enterprise"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-003', 'Sara', 'Kanoo', 's.kanoo@ewbahrain.com', '+97339001103', 'Exhibition World Bahrain (EWB)', 'client', 'active', 'Primary media production & creative liaison for Exhibition World Bahrain (EWB).', '{"events","macc","government"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-004', 'Faisal', 'Fakhro', 'f.fakhro@hnb.com.bh', '+97339001104', 'Harbor National Bank (HNB)', 'client', 'active', 'Primary media production & creative liaison for Harbor National Bank (HNB).', '{"banking","fintech","corporate"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-005', 'Noura', 'Al-Zayani', 'n.zayani@gulfwave.bh', '+97339001105', 'Gulfwave Telecommunications', 'client', 'active', 'Primary media production & creative liaison for Gulfwave Telecommunications.', '{"5g","tvc","telecom"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-006', 'Salman', 'Al-Khalifa', 's.khalifa@bapco.bh', '+97339001106', 'Bapco Energies', 'client', 'active', 'Primary media production & creative liaison for Bapco Energies.', '{"energy","oil_gas","sustainability"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-007', 'Ebrahim', 'Al-Amer', 'e.amer@alba.com.bh', '+97339001107', 'Aluminium Bahrain (Alba)', 'client', 'active', 'Primary media production & creative liaison for Aluminium Bahrain (Alba).', '{"industrial","metals","export"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-008', 'Haya', 'Al-Ghatam', 'h.ghatam@beyon.com', '+97339001108', 'Batelco / Beyon Group', 'client', 'active', 'Primary media production & creative liaison for Batelco / Beyon Group.', '{"telecom","digital","lifestyle"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-009', 'Bader', 'Al-Jalahma', 'b.jalahma@stc.com.bh', '+97339001109', 'STC Bahrain', 'client', 'active', 'Primary media production & creative liaison for STC Bahrain.', '{"telecom","fintech","events"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-010', 'Lulwa', 'Al-Ansari', 'l.ansari@nbbonline.com', '+97339001110', 'National Bank of Bahrain (NBB)', 'client', 'active', 'Primary media production & creative liaison for National Bank of Bahrain (NBB).', '{"finance","heritage","banking"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-011', 'Adel', 'Al-Buainain', 'a.buainain@bbkonline.com', '+97339001111', 'Bank of Bahrain and Kuwait (BBK)', 'client', 'active', 'Primary media production & creative liaison for Bank of Bahrain and Kuwait (BBK).', '{"banking","retail","corporate"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-012', 'Reem', 'Al-Rowaiei', 'r.rowaiei@ahliunited.com', '+97339001112', 'Ahli United Bank (AUB)', 'client', 'active', 'Primary media production & creative liaison for Ahli United Bank (AUB).', '{"private_banking","regional"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-013', 'Mustafa', 'Darwish', 'm.darwish@fintechbay.bh', '+97339001113', 'Bahrain FinTech Bay', 'partner', 'active', 'Primary media production & creative liaison for Bahrain FinTech Bay.', '{"innovation","accelerator","tech"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-014', 'Shaikha', 'Al-Hammadi', 's.hammadi@marassi.bh', '+97339001114', 'Marassi Al Bahrain (Eagle Hills)', 'client', 'active', 'Primary media production & creative liaison for Marassi Al Bahrain (Eagle Hills).', '{"real_estate","luxury","development"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-015', 'Hamad', 'Al-Doseri', 'h.doseri@dilmunia.bh', '+97339001115', 'Dilmunia Health Island', 'client', 'active', 'Primary media production & creative liaison for Dilmunia Health Island.', '{"healthcare","wellness","lifestyle"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-016', 'Dina', 'Balooch', 'd.balooch@fourseasons.com', '+97339001116', 'Four Seasons Hotel Bahrain Bay', 'client', 'active', 'Primary media production & creative liaison for Four Seasons Hotel Bahrain Bay.', '{"hospitality","luxury","dining"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-017', 'Mahmood', 'Al-Maskati', 'm.maskati@ritzcarlton.com', '+97339001117', 'The Ritz-Carlton Bahrain', 'client', 'active', 'Primary media production & creative liaison for The Ritz-Carlton Bahrain.', '{"resort","events","hospitality"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-018', 'Zainab', 'Al-Banna', 'z.banna@danamall.bh', '+97339001118', 'Dana Mall & LuLu Group', 'client', 'active', 'Primary media production & creative liaison for Dana Mall & LuLu Group.', '{"retail","fmcg","shopping"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-019', 'Rawan', 'Al-Arrayed', 'r.arrayed@citycentrebahrain.com', '+97339001119', 'City Centre Bahrain (Majid Al Futtaim)', 'client', 'active', 'Primary media production & creative liaison for City Centre Bahrain (Majid Al Futtaim).', '{"retail","entertainment","campaign"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-020', 'Omar', 'Al-Tajer', 'o.tajer@seef.com.bh', '+97339001120', 'Seef Properties', 'client', 'active', 'Primary media production & creative liaison for Seef Properties.', '{"real_estate","malls","hospitality"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-021', 'Khalid', 'Al-Nuaimi', 'k.nuaimi@bahrainedb.com', '+97339001121', 'Economic Development Board (EDB)', 'partner', 'active', 'Primary media production & creative liaison for Economic Development Board (EDB).', '{"inward_investment","government"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-022', 'Amina', 'Al-Hamar', 'a.hamar@iaa.gov.bh', '+97339001122', 'Information Affairs Authority (IAA)', 'partner', 'active', 'Primary media production & creative liaison for Information Affairs Authority (IAA).', '{"broadcast","licensing","media"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-023', 'Hussain', 'Al-Sharif', 'h.sharif@btea.bh', '+97339001123', 'Bahrain Tourism & Exhibitions Authority (BTEA)', 'client', 'active', 'Primary media production & creative liaison for Bahrain Tourism & Exhibitions Authority (BTEA).', '{"tourism","festivals","culture"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-024', 'Ziyad', 'Al-Kaabi', 'z.kaabi@mumtalakat.bh', '+97339001124', 'Bahrain Mumtalakat Holding', 'client', 'active', 'Primary media production & creative liaison for Bahrain Mumtalakat Holding.', '{"sovereign","investment","portfolio"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-025', 'Mona', 'Al-Shurooqi', 'm.shurooqi@albaraka.com', '+97339001125', 'Al Baraka Banking Group', 'client', 'active', 'Primary media production & creative liaison for Al Baraka Banking Group.', '{"islamic_banking","global","csr"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-026', 'Kareem', 'Merchant', 'k.merchant@gulfair.com', '+97339001126', 'Gulf Air Falcon Corporate', 'client', 'active', 'Primary media production & creative liaison for Gulf Air Falcon Corporate.', '{"national_carrier","in_flight"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-027', 'Fatima', 'Sultan', 'f.sultan@bdutyfree.com', '+97339001127', 'Bahrain Duty Free', 'client', 'active', 'Primary media production & creative liaison for Bahrain Duty Free.', '{"retail","travel","luxury"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-028', 'Waleed', 'Qamber', 'w.qamber@jumeirah.com', '+97339001128', 'Jumeirah Gulf of Bahrain Resort', 'client', 'active', 'Primary media production & creative liaison for Jumeirah Gulf of Bahrain Resort.', '{"resort","spa","tourism"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-029', 'Deena', 'Ghuloom', 'd.ghuloom@ogilvy.com', '+97339001129', 'Memac Ogilvy Bahrain', 'agency', 'active', 'Primary media production & creative liaison for Memac Ogilvy Bahrain.', '{"creative_agency","tvc","advertising"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-030', 'Ali', 'Behzad', 'a.behzad@fpmccann.com', '+97339001130', 'FP7 McCann Bahrain', 'agency', 'active', 'Primary media production & creative liaison for FP7 McCann Bahrain.', '{"advertising","campaigns","media"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-031', 'Layla', 'Rahimi', 'l.rahimi@leoburnett.com', '+97339001131', 'Leo Burnett Middle East', 'agency', 'active', 'Primary media production & creative liaison for Leo Burnett Middle East.', '{"creative","film","production"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-032', 'Ahmed', 'Al-Saffar', 'a.saffar@tbwaraad.com', '+97339001132', 'TBWA Raad Bahrain', 'agency', 'active', 'Primary media production & creative liaison for TBWA Raad Bahrain.', '{"disruption","branding","pr"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-033', 'Maryam', 'Kameshki', 'm.kameshki@alhawaj.com', '+97339001133', 'Al Hawaj Group', 'client', 'active', 'Primary media production & creative liaison for Al Hawaj Group.', '{"perfumes","luxury_retail","fashion"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-034', 'Talal', 'Almoayyed', 't.almoayyed@almoayyed.com.bh', '+97339001134', 'Y.K. Almoayyed & Sons', 'client', 'active', 'Primary media production & creative liaison for Y.K. Almoayyed & Sons.', '{"automotive","electronics","conglomerate"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('cont-035', 'Nasser', 'Kanoo', 'n.kanoo@ekkanoo.com.bh', '+97339001135', 'Ebrahim K. Kanoo (Toyota/Lexus)', 'client', 'active', 'Primary media production & creative liaison for Ebrahim K. Kanoo (Toyota/Lexus).', '{"automotive","tvc","commercials"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-001', 'F1 Gulf Air Bahrain Grand Prix 2027 Broadcast Promos', 'cont-001', 'lead', 2500.000, 'BHD', 20, (CURRENT_DATE + INTERVAL '15 days')::date, 'open', '04c696d7-f5e1-408c-8723-205b567d6119', 'Strategic production deal for F1 Gulf Air Bahrain Grand Prix 2027 Broadcast Promos. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-002', 'Falcon Airways Global Brand Film & In-Flight VR', 'cont-002', 'lead', 3450.000, 'BHD', 20, (CURRENT_DATE + INTERVAL '22 days')::date, 'open', '519c98db-889e-4b93-ba19-0015bde5a465', 'Strategic production deal for Falcon Airways Global Brand Film & In-Flight VR. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-003', 'Exhibition World 2027 Mega-Events Documentary', 'cont-003', 'lead', 4400.000, 'BHD', 20, (CURRENT_DATE + INTERVAL '29 days')::date, 'open', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 'Strategic production deal for Exhibition World 2027 Mega-Events Documentary. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-004', 'Harbor National Bank Flagship Digital Branch Launch', 'cont-004', 'lead', 5350.000, 'BHD', 20, (CURRENT_DATE + INTERVAL '36 days')::date, 'open', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'Strategic production deal for Harbor National Bank Flagship Digital Branch Launch. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-005', 'Gulfwave National 5G Commercial Campaign', 'cont-005', 'lead', 6300.000, 'BHD', 20, (CURRENT_DATE + INTERVAL '43 days')::date, 'open', '67a177f9-65e6-4e40-b0a9-f1168e276326', 'Strategic production deal for Gulfwave National 5G Commercial Campaign. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-006', 'Bapco Solar Energy Park Feature Showcase', 'cont-006', 'lead', 7250.000, 'BHD', 20, (CURRENT_DATE + INTERVAL '50 days')::date, 'open', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 'Strategic production deal for Bapco Solar Energy Park Feature Showcase. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-007', 'Alba Net-Zero Carbon Milestone Docuseries', 'cont-007', 'lead', 8200.000, 'BHD', 20, (CURRENT_DATE + INTERVAL '57 days')::date, 'open', '3e911960-0003-4981-ac1a-8085dd66a212', 'Strategic production deal for Alba Net-Zero Carbon Milestone Docuseries. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-008', 'Beyon Cyber Security Operations Centre Virtual Tour', 'cont-008', 'qualified', 9150.000, 'BHD', 40, (CURRENT_DATE + INTERVAL '15 days')::date, 'open', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 'Strategic production deal for Beyon Cyber Security Operations Centre Virtual Tour. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-009', 'STC 5G Standalone Network Commercial Teasers', 'cont-009', 'qualified', 10100.000, 'BHD', 40, (CURRENT_DATE + INTERVAL '22 days')::date, 'open', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 'Strategic production deal for STC 5G Standalone Network Commercial Teasers. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-010', 'NBB National Day 2026 Historical Docu-Drama', 'cont-010', 'qualified', 11050.000, 'BHD', 40, (CURRENT_DATE + INTERVAL '29 days')::date, 'open', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 'Strategic production deal for NBB National Day 2026 Historical Docu-Drama. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-011', 'BBK Digital Onboarding Social Media Mini-Series', 'cont-011', 'qualified', 12000.000, 'BHD', 40, (CURRENT_DATE + INTERVAL '36 days')::date, 'open', '04c696d7-f5e1-408c-8723-205b567d6119', 'Strategic production deal for BBK Digital Onboarding Social Media Mini-Series. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-012', 'Ahli United Regional Wealth Management Film', 'cont-012', 'qualified', 12950.000, 'BHD', 40, (CURRENT_DATE + INTERVAL '43 days')::date, 'open', '519c98db-889e-4b93-ba19-0015bde5a465', 'Strategic production deal for Ahli United Regional Wealth Management Film. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-013', 'Bahrain FinTech Bay Ecosystem Impact Video', 'cont-013', 'qualified', 13900.000, 'BHD', 40, (CURRENT_DATE + INTERVAL '50 days')::date, 'open', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 'Strategic production deal for Bahrain FinTech Bay Ecosystem Impact Video. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-014', 'Marassi Living Waterfront Residential TVC', 'cont-014', 'proposal', 14850.000, 'BHD', 60, (CURRENT_DATE + INTERVAL '15 days')::date, 'open', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'Strategic production deal for Marassi Living Waterfront Residential TVC. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-015', 'Dilmunia Well-being Island Virtual Reality 360', 'cont-015', 'proposal', 15800.000, 'BHD', 60, (CURRENT_DATE + INTERVAL '22 days')::date, 'open', '67a177f9-65e6-4e40-b0a9-f1168e276326', 'Strategic production deal for Dilmunia Well-being Island Virtual Reality 360. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-016', 'Four Seasons Luxury Pearl Suite Commercial', 'cont-016', 'proposal', 16750.000, 'BHD', 60, (CURRENT_DATE + INTERVAL '29 days')::date, 'open', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 'Strategic production deal for Four Seasons Luxury Pearl Suite Commercial. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-017', 'Ritz-Carlton Royal Beachfront Dining Showcase', 'cont-017', 'proposal', 17700.000, 'BHD', 60, (CURRENT_DATE + INTERVAL '36 days')::date, 'open', '3e911960-0003-4981-ac1a-8085dd66a212', 'Strategic production deal for Ritz-Carlton Royal Beachfront Dining Showcase. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-018', 'Dana Mall Hypermarket Modernization Promos', 'cont-018', 'proposal', 18650.000, 'BHD', 60, (CURRENT_DATE + INTERVAL '43 days')::date, 'open', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 'Strategic production deal for Dana Mall Hypermarket Modernization Promos. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-019', 'City Centre Bahrain Winter Carnival Film', 'cont-019', 'proposal', 19600.000, 'BHD', 60, (CURRENT_DATE + INTERVAL '50 days')::date, 'open', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 'Strategic production deal for City Centre Bahrain Winter Carnival Film. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-020', 'Seef Mall Iconic Pearl Heritage Video Campaign', 'cont-020', 'proposal', 20550.000, 'BHD', 60, (CURRENT_DATE + INTERVAL '57 days')::date, 'open', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 'Strategic production deal for Seef Mall Iconic Pearl Heritage Video Campaign. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-021', 'Bahrain EDB Global Tech Founders Recruitment Videos', 'cont-021', 'negotiation', 21500.000, 'BHD', 80, (CURRENT_DATE + INTERVAL '15 days')::date, 'open', '04c696d7-f5e1-408c-8723-205b567d6119', 'Strategic production deal for Bahrain EDB Global Tech Founders Recruitment Videos. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-022', 'IAA Golden Screen Television Restorations', 'cont-022', 'negotiation', 22450.000, 'BHD', 80, (CURRENT_DATE + INTERVAL '22 days')::date, 'open', '519c98db-889e-4b93-ba19-0015bde5a465', 'Strategic production deal for IAA Golden Screen Television Restorations. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-023', 'BTEA Bahrain Food Festival 2027 Campaign', 'cont-023', 'negotiation', 23400.000, 'BHD', 80, (CURRENT_DATE + INTERVAL '29 days')::date, 'open', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 'Strategic production deal for BTEA Bahrain Food Festival 2027 Campaign. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-024', 'Mumtalakat Sustainable Assets Portfolio Film', 'cont-024', 'negotiation', 24350.000, 'BHD', 80, (CURRENT_DATE + INTERVAL '36 days')::date, 'open', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'Strategic production deal for Mumtalakat Sustainable Assets Portfolio Film. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-025', 'Al Baraka Ethical Banking Worldwide Campaign', 'cont-025', 'negotiation', 25300.000, 'BHD', 80, (CURRENT_DATE + INTERVAL '43 days')::date, 'open', '67a177f9-65e6-4e40-b0a9-f1168e276326', 'Strategic production deal for Al Baraka Ethical Banking Worldwide Campaign. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-026', 'Gulf Air Heritage Flight 75th Anniversary Film', 'cont-026', 'negotiation', 26250.000, 'BHD', 80, (CURRENT_DATE + INTERVAL '50 days')::date, 'open', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 'Strategic production deal for Gulf Air Heritage Flight 75th Anniversary Film. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-027', 'Bahrain Duty Free Luxury Concourse Walkthrough', 'cont-027', 'negotiation', 27200.000, 'BHD', 80, (CURRENT_DATE + INTERVAL '57 days')::date, 'open', '3e911960-0003-4981-ac1a-8085dd66a212', 'Strategic production deal for Bahrain Duty Free Luxury Concourse Walkthrough. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-028', 'Jumeirah Resort Coastal Sunsets Cinema Package', 'cont-028', 'closed_won', 28150.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 'Strategic production deal for Jumeirah Resort Coastal Sunsets Cinema Package. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-029', 'Ogilvy Luxury Perfume TVC Studio Production', 'cont-029', 'closed_won', 29100.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 'Strategic production deal for Ogilvy Luxury Perfume TVC Studio Production. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-030', 'FP7 McCann Telecom Ramadan TVC Principal Shoot', 'cont-030', 'closed_won', 30050.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 'Strategic production deal for FP7 McCann Telecom Ramadan TVC Principal Shoot. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-031', 'Leo Burnett Regional Bank Summer Campaign', 'cont-031', 'closed_won', 31000.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '04c696d7-f5e1-408c-8723-205b567d6119', 'Strategic production deal for Leo Burnett Regional Bank Summer Campaign. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-032', 'TBWA Raad FinTech AI Assistant Explainer', 'cont-032', 'closed_won', 31950.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '519c98db-889e-4b93-ba19-0015bde5a465', 'Strategic production deal for TBWA Raad FinTech AI Assistant Explainer. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-033', 'Al Hawaj Signature Oudh Fragrance Launch Film', 'cont-033', 'closed_won', 32900.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 'Strategic production deal for Al Hawaj Signature Oudh Fragrance Launch Film. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-034', 'Almoayyed Motors Commercial Vehicles Fleet Shoot', 'cont-034', 'closed_won', 33850.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'Strategic production deal for Almoayyed Motors Commercial Vehicles Fleet Shoot. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-035', 'Toyota Land Cruiser Extreme Offroad Desert TVC', 'cont-035', 'closed_won', 34800.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '67a177f9-65e6-4e40-b0a9-f1168e276326', 'Strategic production deal for Toyota Land Cruiser Extreme Offroad Desert TVC. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-036', 'Lexus Electrified Luxury SUV Launch Master', 'cont-001', 'closed_won', 35750.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '3b06b26b-5eb5-4395-837e-4e24d0a148de', 'Strategic production deal for Lexus Electrified Luxury SUV Launch Master. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-037', 'Bahrain Bay Sunset Hyperlapse Drone 8K Reel', 'cont-002', 'closed_won', 36700.000, 'BHD', 100, (CURRENT_DATE + INTERVAL '-20 days')::date, 'won', '3e911960-0003-4981-ac1a-8085dd66a212', 'Strategic production deal for Bahrain Bay Sunset Hyperlapse Drone 8K Reel. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-038', 'South Governorate Coastal Preservation Short', 'cont-003', 'closed_lost', 2650.000, 'BHD', 0, (CURRENT_DATE + INTERVAL '-10 days')::date, 'lost', '17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 'Strategic production deal for South Governorate Coastal Preservation Short. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-039', 'Manama Souq Artisans Heritage Digital Archive', 'cont-004', 'closed_lost', 3600.000, 'BHD', 0, (CURRENT_DATE + INTERVAL '-10 days')::date, 'lost', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 'Strategic production deal for Manama Souq Artisans Heritage Digital Archive. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-040', 'Pearling Path UNESCO World Heritage Showcase', 'cont-005', 'closed_lost', 4550.000, 'BHD', 0, (CURRENT_DATE + INTERVAL '-10 days')::date, 'lost', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 'Strategic production deal for Pearling Path UNESCO World Heritage Showcase. Assigned to production lead.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-001', 'QTE-2026-001', 'cont-001', 'deal-001', 'accepted', 3000.000, 0.000, 10, 300, 3300, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for F1 Gulf Air Bahrain Grand Prix 2027 Broadcast Promos', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-002', 'QTE-2026-002', 'cont-002', 'deal-002', 'accepted', 4200.000, 0.000, 10, 420, 4620, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Falcon Airways Global Brand Film & In-Flight VR', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-003', 'QTE-2026-003', 'cont-003', 'deal-003', 'accepted', 5400.000, 0.000, 10, 540, 5940, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Exhibition World 2027 Mega-Events Documentary', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-004', 'QTE-2026-004', 'cont-004', 'deal-004', 'accepted', 6600.000, 0.000, 10, 660, 7260, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Harbor National Bank Flagship Digital Branch Launch', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-005', 'QTE-2026-005', 'cont-005', 'deal-005', 'accepted', 7800.000, 0.000, 10, 780, 8580, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Gulfwave National 5G Commercial Campaign', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-006', 'QTE-2026-006', 'cont-006', 'deal-006', 'accepted', 9000.000, 0.000, 10, 900, 9900, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Bapco Solar Energy Park Feature Showcase', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-007', 'QTE-2026-007', 'cont-007', 'deal-007', 'accepted', 10200.000, 0.000, 10, 1020, 11220, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Alba Net-Zero Carbon Milestone Docuseries', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-008', 'QTE-2026-008', 'cont-008', 'deal-008', 'accepted', 11400.000, 0.000, 10, 1140, 12540, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Beyon Cyber Security Operations Centre Virtual Tour', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-009', 'QTE-2026-009', 'cont-009', 'deal-009', 'accepted', 12600.000, 0.000, 10, 1260, 13860, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for STC 5G Standalone Network Commercial Teasers', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-010', 'QTE-2026-010', 'cont-010', 'deal-010', 'accepted', 13800.000, 0.000, 10, 1380, 15180, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for NBB National Day 2026 Historical Docu-Drama', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-011', 'QTE-2026-011', 'cont-011', 'deal-011', 'accepted', 15000.000, 0.000, 10, 1500, 16500, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for BBK Digital Onboarding Social Media Mini-Series', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-012', 'QTE-2026-012', 'cont-012', 'deal-012', 'accepted', 16200.000, 0.000, 10, 1620, 17820, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Ahli United Regional Wealth Management Film', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-013', 'QTE-2026-013', 'cont-013', 'deal-013', 'accepted', 17400.000, 0.000, 10, 1740, 19140, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Bahrain FinTech Bay Ecosystem Impact Video', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-014', 'QTE-2026-014', 'cont-014', 'deal-014', 'accepted', 18600.000, 0.000, 10, 1860, 20460, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Marassi Living Waterfront Residential TVC', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-015', 'QTE-2026-015', 'cont-015', 'deal-015', 'accepted', 19800.000, 0.000, 10, 1980, 21780, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Dilmunia Well-being Island Virtual Reality 360', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-016', 'QTE-2026-016', 'cont-016', 'deal-016', 'sent', 21000.000, 0.000, 10, 2100, 23100, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Four Seasons Luxury Pearl Suite Commercial', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-017', 'QTE-2026-017', 'cont-017', 'deal-017', 'sent', 22200.000, 0.000, 10, 2220, 24420, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Ritz-Carlton Royal Beachfront Dining Showcase', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-018', 'QTE-2026-018', 'cont-018', 'deal-018', 'sent', 23400.000, 0.000, 10, 2340, 25740, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Dana Mall Hypermarket Modernization Promos', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-019', 'QTE-2026-019', 'cont-019', 'deal-019', 'sent', 24600.000, 0.000, 10, 2460, 27060, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for City Centre Bahrain Winter Carnival Film', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-020', 'QTE-2026-020', 'cont-020', 'deal-020', 'sent', 25800.000, 0.000, 10, 2580, 28380, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Seef Mall Iconic Pearl Heritage Video Campaign', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-021', 'QTE-2026-021', 'cont-021', 'deal-021', 'sent', 27000.000, 0.000, 10, 2700, 29700, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Bahrain EDB Global Tech Founders Recruitment Videos', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-022', 'QTE-2026-022', 'cont-022', 'deal-022', 'sent', 3200.000, 0.000, 10, 320, 3520, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for IAA Golden Screen Television Restorations', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-023', 'QTE-2026-023', 'cont-023', 'deal-023', 'draft', 4400.000, 0.000, 10, 440, 4840, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for BTEA Bahrain Food Festival 2027 Campaign', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-024', 'QTE-2026-024', 'cont-024', 'deal-024', 'draft', 5600.000, 0.000, 10, 560, 6160, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Mumtalakat Sustainable Assets Portfolio Film', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-025', 'QTE-2026-025', 'cont-025', 'deal-025', 'draft', 6800.000, 0.000, 10, 680, 7480, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Al Baraka Ethical Banking Worldwide Campaign', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-026', 'QTE-2026-026', 'cont-026', 'deal-026', 'draft', 8000.000, 0.000, 10, 800, 8800, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Gulf Air Heritage Flight 75th Anniversary Film', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-027', 'QTE-2026-027', 'cont-027', 'deal-027', 'rejected', 9200.000, 0.000, 10, 920, 10120, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Bahrain Duty Free Luxury Concourse Walkthrough', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-028', 'QTE-2026-028', 'cont-028', 'deal-028', 'rejected', 10400.000, 0.000, 10, 1040, 11440, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Jumeirah Resort Coastal Sunsets Cinema Package', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-029', 'QTE-2026-029', 'cont-029', 'deal-029', 'rejected', 11600.000, 0.000, 10, 1160, 12760, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for Ogilvy Luxury Perfume TVC Studio Production', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('qte-030', 'QTE-2026-030', 'cont-030', 'deal-030', 'rejected', 12800.000, 0.000, 10, 1280, 14080, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.', 'Production proposal for FP7 McCann Telecom Ramadan TVC Principal Shoot', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-001', 'qte-001', 'Principal Photography & Cinema Gear Crew Package', 1, 2100, 2100, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-002', 'qte-001', 'Post-Production, Color Grading & Cinema Surround Master', 1, 900, 900, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-003', 'qte-002', 'Principal Photography & Cinema Gear Crew Package', 1, 2940, 2940, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-004', 'qte-002', 'Post-Production, Color Grading & Cinema Surround Master', 1, 1260, 1260, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-005', 'qte-003', 'Principal Photography & Cinema Gear Crew Package', 1, 3780, 3780, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-006', 'qte-003', 'Post-Production, Color Grading & Cinema Surround Master', 1, 1620, 1620, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-007', 'qte-004', 'Principal Photography & Cinema Gear Crew Package', 1, 4620, 4620, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-008', 'qte-004', 'Post-Production, Color Grading & Cinema Surround Master', 1, 1980, 1980, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-009', 'qte-005', 'Principal Photography & Cinema Gear Crew Package', 1, 5460, 5460, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-010', 'qte-005', 'Post-Production, Color Grading & Cinema Surround Master', 1, 2340, 2340, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-011', 'qte-006', 'Principal Photography & Cinema Gear Crew Package', 1, 6300, 6300, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-012', 'qte-006', 'Post-Production, Color Grading & Cinema Surround Master', 1, 2700, 2700, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-013', 'qte-007', 'Principal Photography & Cinema Gear Crew Package', 1, 7140, 7140, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-014', 'qte-007', 'Post-Production, Color Grading & Cinema Surround Master', 1, 3060, 3060, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-015', 'qte-008', 'Principal Photography & Cinema Gear Crew Package', 1, 7980, 7980, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-016', 'qte-008', 'Post-Production, Color Grading & Cinema Surround Master', 1, 3420, 3420, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-017', 'qte-009', 'Principal Photography & Cinema Gear Crew Package', 1, 8820, 8820, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-018', 'qte-009', 'Post-Production, Color Grading & Cinema Surround Master', 1, 3780, 3780, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-019', 'qte-010', 'Principal Photography & Cinema Gear Crew Package', 1, 9660, 9660, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-020', 'qte-010', 'Post-Production, Color Grading & Cinema Surround Master', 1, 4140, 4140, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-021', 'qte-011', 'Principal Photography & Cinema Gear Crew Package', 1, 10500, 10500, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-022', 'qte-011', 'Post-Production, Color Grading & Cinema Surround Master', 1, 4500, 4500, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-023', 'qte-012', 'Principal Photography & Cinema Gear Crew Package', 1, 11340, 11340, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-024', 'qte-012', 'Post-Production, Color Grading & Cinema Surround Master', 1, 4860, 4860, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-025', 'qte-013', 'Principal Photography & Cinema Gear Crew Package', 1, 12180, 12180, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-026', 'qte-013', 'Post-Production, Color Grading & Cinema Surround Master', 1, 5220, 5220, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-027', 'qte-014', 'Principal Photography & Cinema Gear Crew Package', 1, 13020, 13020, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-028', 'qte-014', 'Post-Production, Color Grading & Cinema Surround Master', 1, 5580, 5580, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-029', 'qte-015', 'Principal Photography & Cinema Gear Crew Package', 1, 13860, 13860, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-030', 'qte-015', 'Post-Production, Color Grading & Cinema Surround Master', 1, 5940, 5940, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-031', 'qte-016', 'Principal Photography & Cinema Gear Crew Package', 1, 14700, 14700, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-032', 'qte-016', 'Post-Production, Color Grading & Cinema Surround Master', 1, 6300, 6300, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-033', 'qte-017', 'Principal Photography & Cinema Gear Crew Package', 1, 15540, 15540, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-034', 'qte-017', 'Post-Production, Color Grading & Cinema Surround Master', 1, 6660, 6660, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-035', 'qte-018', 'Principal Photography & Cinema Gear Crew Package', 1, 16380, 16380, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-036', 'qte-018', 'Post-Production, Color Grading & Cinema Surround Master', 1, 7020, 7020, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-037', 'qte-019', 'Principal Photography & Cinema Gear Crew Package', 1, 17220, 17220, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-038', 'qte-019', 'Post-Production, Color Grading & Cinema Surround Master', 1, 7380, 7380, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-039', 'qte-020', 'Principal Photography & Cinema Gear Crew Package', 1, 18060, 18060, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-040', 'qte-020', 'Post-Production, Color Grading & Cinema Surround Master', 1, 7740, 7740, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-041', 'qte-021', 'Principal Photography & Cinema Gear Crew Package', 1, 18900, 18900, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-042', 'qte-021', 'Post-Production, Color Grading & Cinema Surround Master', 1, 8100, 8100, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-043', 'qte-022', 'Principal Photography & Cinema Gear Crew Package', 1, 2240, 2240, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-044', 'qte-022', 'Post-Production, Color Grading & Cinema Surround Master', 1, 960, 960, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-045', 'qte-023', 'Principal Photography & Cinema Gear Crew Package', 1, 3080, 3080, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-046', 'qte-023', 'Post-Production, Color Grading & Cinema Surround Master', 1, 1320, 1320, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-047', 'qte-024', 'Principal Photography & Cinema Gear Crew Package', 1, 3920, 3920, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-048', 'qte-024', 'Post-Production, Color Grading & Cinema Surround Master', 1, 1680, 1680, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-049', 'qte-025', 'Principal Photography & Cinema Gear Crew Package', 1, 4760, 4760, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-050', 'qte-025', 'Post-Production, Color Grading & Cinema Surround Master', 1, 2040, 2040, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-051', 'qte-026', 'Principal Photography & Cinema Gear Crew Package', 1, 5600, 5600, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-052', 'qte-026', 'Post-Production, Color Grading & Cinema Surround Master', 1, 2400, 2400, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-053', 'qte-027', 'Principal Photography & Cinema Gear Crew Package', 1, 6440, 6440, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-054', 'qte-027', 'Post-Production, Color Grading & Cinema Surround Master', 1, 2760, 2760, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-055', 'qte-028', 'Principal Photography & Cinema Gear Crew Package', 1, 7280, 7280, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-056', 'qte-028', 'Post-Production, Color Grading & Cinema Surround Master', 1, 3120, 3120, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-057', 'qte-029', 'Principal Photography & Cinema Gear Crew Package', 1, 8120, 8120, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-058', 'qte-029', 'Post-Production, Color Grading & Cinema Surround Master', 1, 3480, 3480, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-059', 'qte-030', 'Principal Photography & Cinema Gear Crew Package', 1, 8960, 8960, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('qi-060', 'qte-030', 'Post-Production, Color Grading & Cinema Surround Master', 1, 3840, 3840, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-001', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Jasim Al-Shirawi', 'j.shirawi@bic.com.bh', '+97339001101', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-002', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Tariq Al-Moayyed', 't.moayyed@falconair.com', '+97339001102', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-003', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Sara Kanoo', 's.kanoo@ewbahrain.com', '+97339001103', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-004', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Faisal Fakhro', 'f.fakhro@hnb.com.bh', '+97339001104', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-005', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Noura Al-Zayani', 'n.zayani@gulfwave.bh', '+97339001105', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-006', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Salman Al-Khalifa', 's.khalifa@bapco.bh', '+97339001106', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-007', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Ebrahim Al-Amer', 'e.amer@alba.com.bh', '+97339001107', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-008', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Haya Al-Ghatam', 'h.ghatam@beyon.com', '+97339001108', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-009', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Bader Al-Jalahma', 'b.jalahma@stc.com.bh', '+97339001109', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-010', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Lulwa Al-Ansari', 'l.ansari@nbbonline.com', '+97339001110', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-011', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Adel Al-Buainain', 'a.buainain@bbkonline.com', '+97339001111', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-012', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Reem Al-Rowaiei', 'r.rowaiei@ahliunited.com', '+97339001112', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-013', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Mustafa Darwish', 'm.darwish@fintechbay.bh', '+97339001113', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-014', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Shaikha Al-Hammadi', 's.hammadi@marassi.bh', '+97339001114', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('inq-015', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', 'Hamad Al-Doseri', 'h.doseri@dilmunia.bh', '+97339001115', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. FINANCE SERVICE (Expense Categories, Expenses, 55 Invoices across Aging Buckets, Payments)
-- ----------------------------------------------------------------------------
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-01', 'gear_rental', 'Equipment & Gear Rentals', 'استئجار معدات وكاميرات', 1) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-02', 'crew_wages', 'Crew & Talent Wages', 'أجور الطواقم والممثلين', 2) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-03', 'travel_logistics', 'Travel & Location Logistics', 'سفر ونقل وإعاشة', 3) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-04', 'studio_overhead', 'Studio Lease & Utilities', 'إيجار ومصاريف الاستوديو', 4) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-05', 'software_licenses', 'Software, Storage & Cloud', 'برمجيات واشتراكات وسحابة', 5) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-06', 'marketing_pr', 'Marketing & Festival Submissions', 'تسويق ومشاركات مهرجانات', 6) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-07', 'salaries', 'Salaries & Wages', 'الرواتب والأجور', 7) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-08', 'gosi', 'Pensions & Social Insurance', 'التأمينات الاجتماعية', 8) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-09', 'staff_benefits', 'Staff Benefits & Allowances', 'مزايا وبدلات الموظفين', 9) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-10', 'commissions', 'Sales Commissions & Incentives', 'عمولات وحوافز المبيعات', 10) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-28', 'other', 'Other Expenses', 'مصروفات أخرى', 28) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-11', 'maintenance_repairs', 'Gear Calibration & Repairs', 'صيانة ومعايرة المعدات', 11) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES ('expcat-12', 'legal_accounting', 'Legal & Professional Audit', 'استشارات قانونية ومحاسبية', 12) ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES
  ('expcat-11', 'maintenance_repairs', 'Gear Calibration & Repairs', 'صيانة ومعايرة المعدات', 11),
  ('expcat-12', 'legal_accounting', 'Legal & Professional Audit', 'استشارات قانونية ومحاسبية', 12)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-001', 'Specialized Anamorphic Prime Lenses Sub-Lease', 850.000, 'BHD', 'expcat-01', (CURRENT_DATE - INTERVAL '154 days')::date, 'Gulf Optics & Grip', 'approved', 'Verified receipt and logged into ledger under expcat-01.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-002', '7.1 Cinema Soundstage Surround Mix Engineer Sessions', 620.000, 'BHD', 'expcat-02', (CURRENT_DATE - INTERVAL '150 days')::date, 'Bahrain Sound Labs', 'approved', 'Verified receipt and logged into ledger under expcat-02.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-003', 'Location Scouting 4x4 Fleet & Fuel — Southern Desert', 380.000, 'BHD', 'expcat-03', (CURRENT_DATE - INTERVAL '145 days')::date, 'Manama Transport Co.', 'approved', 'Verified receipt and logged into ledger under expcat-03.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-004', 'Soundstage 180kVA Mobile Power Generator Sub-Rental', 550.000, 'BHD', 'expcat-04', (CURRENT_DATE - INTERVAL '140 days')::date, 'Electricity & Water Authority Hookups', 'approved', 'Verified receipt and logged into ledger under expcat-04.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-005', 'Frame.io & DaVinci Resolve Cloud Enterprise 1yr Renewal', 480.000, 'BHD', 'expcat-05', (CURRENT_DATE - INTERVAL '135 days')::date, 'Blackmagic Design & Adobe Cloud', 'approved', 'Verified receipt and logged into ledger under expcat-05.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-006', 'Civil Aviation Affairs Drone Airspace Flight Permits (Zone A)', 550.000, 'BHD', 'expcat-06', (CURRENT_DATE - INTERVAL '130 days')::date, 'Ministry of Transportation & Telecom', 'approved', 'Verified receipt and logged into ledger under expcat-06.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-007', 'Voiceover Recording Artist Sessions & Arabic Narration', 420.000, 'BHD', 'expcat-07', (CURRENT_DATE - INTERVAL '125 days')::date, 'Gulf Media Talent Agency', 'approved', 'Verified receipt and logged into ledger under expcat-07.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-008', 'Studio Soundstage Green Cyclorama Wall Repaint & Prep', 280.000, 'BHD', 'expcat-08', (CURRENT_DATE - INTERVAL '120 days')::date, 'Seef Paint & Studio Maintenance', 'approved', 'Verified receipt and logged into ledger under expcat-08.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-009', 'DCI 4K Barco Cinema Projection Calibration & Licensing', 650.000, 'BHD', 'expcat-09', (CURRENT_DATE - INTERVAL '115 days')::date, 'Cinema Engineering Middle East', 'approved', 'Verified receipt and logged into ledger under expcat-09.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-010', 'Middle East Film Festival Showcase Submission Fees', 340.000, 'BHD', 'expcat-10', (CURRENT_DATE - INTERVAL '110 days')::date, 'Red Sea & Dubai Film Mart', 'approved', 'Verified receipt and logged into ledger under expcat-10.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-011', 'Cooke Lens Ultrasonic Cleaning & Optical Collimation', 720.000, 'BHD', 'expcat-11', (CURRENT_DATE - INTERVAL '105 days')::date, 'Optics Tech Service Germany', 'approved', 'Verified receipt and logged into ledger under expcat-11.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-012', 'Annual External Financial Audit & Tax Filing Service', 1500.000, 'BHD', 'expcat-12', (CURRENT_DATE - INTERVAL '100 days')::date, 'KPMG Fakhro Bahrain', 'approved', 'Verified receipt and logged into ledger under expcat-12.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-013', 'High-Speed Phantom Flex4K Camera Rental for Fluid TVC', 1250.000, 'BHD', 'expcat-01', (CURRENT_DATE - INTERVAL '95 days')::date, 'Arabia Camera Rentals Dubai', 'approved', 'Verified receipt and logged into ledger under expcat-01.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-014', 'Foley Artistry & Custom Acoustic Sound Design Library', 450.000, 'BHD', 'expcat-02', (CURRENT_DATE - INTERVAL '90 days')::date, 'Soundscape Audio Bahrain', 'approved', 'Verified receipt and logged into ledger under expcat-02.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-015', 'Production Crew Craft Services & Gourmet Hot Catering (40 crew)', 580.000, 'BHD', 'expcat-03', (CURRENT_DATE - INTERVAL '85 days')::date, 'Gourmet Catering Co. W.L.L.', 'approved', 'Verified receipt and logged into ledger under expcat-03.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-016', 'Studio Soundstage High-Capacity Air Conditioning Heavy Power', 420.000, 'BHD', 'expcat-04', (CURRENT_DATE - INTERVAL '80 days')::date, 'Bahrain Cooling Systems', 'approved', 'Verified receipt and logged into ledger under expcat-04.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-017', 'Boris FX Sapphire & Mocha Pro Post-Production Licenses', 390.000, 'BHD', 'expcat-05', (CURRENT_DATE - INTERVAL '75 days')::date, 'Boris FX Software', 'approved', 'Verified receipt and logged into ledger under expcat-05.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-018', 'Bahrain Bay Coastal Filming Permit & Water Security Boat', 350.000, 'BHD', 'expcat-06', (CURRENT_DATE - INTERVAL '70 days')::date, 'Information Affairs Authority', 'approved', 'Verified receipt and logged into ledger under expcat-06.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-019', 'Principal Actors Day Rates — Telecom Ramadan Commercial', 1100.000, 'BHD', 'expcat-07', (CURRENT_DATE - INTERVAL '65 days')::date, 'Bahrain Actor Guild & Casting', 'approved', 'Verified receipt and logged into ledger under expcat-07.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-020', 'Custom Futuristic Bank Branch Set Construction & Props', 890.000, 'BHD', 'expcat-08', (CURRENT_DATE - INTERVAL '60 days')::date, 'Artistry Woodcraft & Sets', 'approved', 'Verified receipt and logged into ledger under expcat-08.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-021', 'Dolby Vision HDR Master Deliverable License & Quality Check', 750.000, 'BHD', 'expcat-09', (CURRENT_DATE - INTERVAL '55 days')::date, 'Dolby Laboratories ME', 'approved', 'Verified receipt and logged into ledger under expcat-09.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-022', 'Social Media Campaign Paid Boost & Reel Distribution', 450.000, 'BHD', 'expcat-10', (CURRENT_DATE - INTERVAL '50 days')::date, 'Meta Platforms Ireland', 'approved', 'Verified receipt and logged into ledger under expcat-10.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-023', 'DJI Ronin 4D Gimbal Motor Recalibration & Cable Loom Replacement', 310.000, 'BHD', 'expcat-11', (CURRENT_DATE - INTERVAL '45 days')::date, 'DJI Authorized Service GCC', 'approved', 'Verified receipt and logged into ledger under expcat-11.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-024', 'Intellectual Property & Trademark Legal Consultation', 650.000, 'BHD', 'expcat-12', (CURRENT_DATE - INTERVAL '40 days')::date, 'Hassan Radhi & Associates', 'approved', 'Verified receipt and logged into ledger under expcat-12.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-025', 'Astera Titan Tubes 8-Light Kit Sub-Rental for Night Shoot', 620.000, 'BHD', 'expcat-01', (CURRENT_DATE - INTERVAL '35 days')::date, 'Gulf Optics & Grip', 'approved', 'Verified receipt and logged into ledger under expcat-01.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-026', 'Sennheiser Wireless Frequency Coordination Clearance', 250.000, 'BHD', 'expcat-02', (CURRENT_DATE - INTERVAL '30 days')::date, 'Telecommunications Regulatory Authority (TRA)', 'approved', 'Verified receipt and logged into ledger under expcat-02.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-027', 'Production Logistics Van Fuel, Tolls & Airport Transfers', 280.000, 'BHD', 'expcat-03', (CURRENT_DATE - INTERVAL '25 days')::date, 'Bahrain Airport Services Logistics', 'approved', 'Verified receipt and logged into ledger under expcat-03.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-028', 'Soundstage Soundproofing & Heavy Acoustic Baffles Addition', 480.000, 'BHD', 'expcat-04', (CURRENT_DATE - INTERVAL '20 days')::date, 'Acoustic Solutions W.L.L.', 'approved', 'Verified receipt and logged into ledger under expcat-04.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-029', 'Cinema 4D & Redshift Render Engine Annual Licenses', 560.000, 'BHD', 'expcat-05', (CURRENT_DATE - INTERVAL '15 days')::date, 'Maxon Computer GmbH', 'approved', 'Verified receipt and logged into ledger under expcat-05.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-030', 'Heritage Village Filming Clearance & Police Escort Fee', 220.000, 'BHD', 'expcat-06', (CURRENT_DATE - INTERVAL '12 days')::date, 'Ministry of Interior Traffic Directorate', 'approved', 'Verified receipt and logged into ledger under expcat-06.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-031', 'Voice Talent & English Broadcast Narrator Licensing', 380.000, 'BHD', 'expcat-07', (CURRENT_DATE - INTERVAL '9 days')::date, 'Voiceovers UK Ltd', 'approved', 'Verified receipt and logged into ledger under expcat-07.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-032', 'Soundstage Chromakey Floor Epoxy Resurfacing', 320.000, 'BHD', 'expcat-08', (CURRENT_DATE - INTERVAL '7 days')::date, 'Modern Paints Bahrain', 'approved', 'Verified receipt and logged into ledger under expcat-08.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-033', 'Color Grading Suite Sony BVM Monitor Annual Calibration', 490.000, 'BHD', 'expcat-09', (CURRENT_DATE - INTERVAL '5 days')::date, 'Sony Professional Middle East', 'approved', 'Verified receipt and logged into ledger under expcat-09.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-034', 'Production Portfolio Brand Book Printing & Premium Binding', 340.000, 'BHD', 'expcat-10', (CURRENT_DATE - INTERVAL '3 days')::date, 'Al Ayam Publishing Press', 'approved', 'Verified receipt and logged into ledger under expcat-10.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)
VALUES ('exp-035', 'Studio Soundstage High-Capacity Power Load Hookup', 420.000, 'BHD', 'expcat-04', (CURRENT_DATE - INTERVAL '1 days')::date, 'Electricity & Water Authority Hookups', 'approved', 'Verified receipt and logged into ledger under expcat-04.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-01', 'INV-2026-001', 'cont-001', 'paid', (CURRENT_DATE - INTERVAL '155 days')::date, (CURRENT_DATE - INTERVAL '125 days')::date, 5400.000, 0.000, 10, 540, 5940, 5940, 0, 'BHD', 'F1 Season Opener Trackside Cinematography & FPV Rigging', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-02', 'INV-2026-002', 'cont-002', 'paid', (CURRENT_DATE - INTERVAL '150 days')::date, (CURRENT_DATE - INTERVAL '120 days')::date, 8800.000, 0.000, 10, 880, 9680, 9680, 0, 'BHD', 'Falcon Airways Fleet Refresh In-Flight Safety Master 4K', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-03', 'INV-2026-003', 'cont-003', 'paid', (CURRENT_DATE - INTERVAL '145 days')::date, (CURRENT_DATE - INTERVAL '115 days')::date, 12000.000, 0.000, 10, 1200, 13200, 13200, 0, 'BHD', 'Exhibition World Inaugural Summit Multi-Camera Livestream', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-04', 'INV-2026-004', 'cont-004', 'paid', (CURRENT_DATE - INTERVAL '140 days')::date, (CURRENT_DATE - INTERVAL '110 days')::date, 7200.000, 0.000, 10, 720, 7920, 7920, 0, 'BHD', 'Digital Banking Mobile App Launch Teasers & Cinema Cutdowns', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-05', 'INV-2026-005', 'cont-005', 'paid', (CURRENT_DATE - INTERVAL '135 days')::date, (CURRENT_DATE - INTERVAL '105 days')::date, 9500.000, 0.000, 10, 950, 10450, 10450, 0, 'BHD', 'Gulfwave 5G Network Ultra-HD Commercial TVC Production', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-06', 'INV-2026-006', 'cont-006', 'paid', (CURRENT_DATE - INTERVAL '130 days')::date, (CURRENT_DATE - INTERVAL '100 days')::date, 6400.000, 0.000, 10, 640, 7040, 7040, 0, 'BHD', 'Bapco Energies Sustainability Docu-Feature (Phase 1)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-07', 'INV-2026-007', 'cont-007', 'paid', (CURRENT_DATE - INTERVAL '125 days')::date, (CURRENT_DATE - INTERVAL '95 days')::date, 4800.000, 0.000, 10, 480, 5280, 5280, 0, 'BHD', 'Alba Line 6 Smelter Industrial Hyperlapse & Drone Photography', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-08', 'INV-2026-008', 'cont-008', 'paid', (CURRENT_DATE - INTERVAL '120 days')::date, (CURRENT_DATE - INTERVAL '90 days')::date, 4200.000, 0.000, 10, 420, 4620, 4620, 0, 'BHD', 'Beyon Digital Campus Architectural Tour & 360 Experience', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-09', 'INV-2026-009', 'cont-009', 'paid', (CURRENT_DATE - INTERVAL '115 days')::date, (CURRENT_DATE - INTERVAL '85 days')::date, 3900.000, 0.000, 10, 390, 4290, 4290, 0, 'BHD', 'STC Winter Festival Drone Light Show Video Production', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-10', 'INV-2026-010', 'cont-010', 'paid', (CURRENT_DATE - INTERVAL '110 days')::date, (CURRENT_DATE - INTERVAL '80 days')::date, 14500.000, 0.000, 10, 1450, 15950, 15950, 0, 'BHD', 'National Bank of Bahrain 65th Anniversary Film Mastering', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-11', 'INV-2026-011', 'cont-011', 'paid', (CURRENT_DATE - INTERVAL '105 days')::date, (CURRENT_DATE - INTERVAL '75 days')::date, 3200.000, 0.000, 10, 320, 3520, 3520, 0, 'BHD', 'BBK Super Saver Campaign Social Cutdowns & Audio Mastering', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-12', 'INV-2026-012', 'cont-012', 'paid', (CURRENT_DATE - INTERVAL '100 days')::date, (CURRENT_DATE - INTERVAL '70 days')::date, 5600.000, 0.000, 10, 560, 6160, 6160, 0, 'BHD', 'Ahli United Bank Private Wealth Summit Documentaries', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-13', 'INV-2026-013', 'cont-013', 'paid', (CURRENT_DATE - INTERVAL '95 days')::date, (CURRENT_DATE - INTERVAL '65 days')::date, 2800.000, 0.000, 10, 280, 3080, 3080, 0, 'BHD', 'FinTech Acceleration Demo Day Highlights & Founder Spotlights', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-14', 'INV-2026-014', 'cont-014', 'paid', (CURRENT_DATE - INTERVAL '90 days')::date, (CURRENT_DATE - INTERVAL '60 days')::date, 8200.000, 0.000, 10, 820, 9020, 9020, 0, 'BHD', 'Marassi Beachfront Lifestyle Cinematography Package', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-15', 'INV-2026-015', 'cont-015', 'paid', (CURRENT_DATE - INTERVAL '85 days')::date, (CURRENT_DATE - INTERVAL '55 days')::date, 3600.000, 0.000, 10, 360, 3960, 3960, 0, 'BHD', 'Dilmunia Canal Promenade Sunset Time-Lapse & Drone Survey', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-16', 'INV-2026-016', 'cont-016', 'paid', (CURRENT_DATE - INTERVAL '80 days')::date, (CURRENT_DATE - INTERVAL '50 days')::date, 4500.000, 0.000, 10, 450, 4950, 4950, 0, 'BHD', 'Four Seasons Bahrain Bay Gourmet Culinary Masterclass Series', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-17', 'INV-2026-017', 'cont-017', 'paid', (CURRENT_DATE - INTERVAL '75 days')::date, (CURRENT_DATE - INTERVAL '45 days')::date, 6800.000, 0.000, 10, 680, 7480, 7480, 0, 'BHD', 'Ritz-Carlton Beach Resort Summer Campaign Commercials', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-18', 'INV-2026-018', 'cont-018', 'paid', (CURRENT_DATE - INTERVAL '70 days')::date, (CURRENT_DATE - INTERVAL '40 days')::date, 2200.000, 0.000, 10, 220, 2420, 2420, 0, 'BHD', 'Dana Mall Family Shopping Festival Promo Spots', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-19', 'INV-2026-019', 'cont-019', 'paid', (CURRENT_DATE - INTERVAL '60 days')::date, (CURRENT_DATE - INTERVAL '30 days')::date, 5100.000, 0.000, 10, 510, 5610, 5610, 0, 'BHD', 'City Centre Bahrain Fashion Weekend 4K Highlights & TVC', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-20', 'INV-2026-020', 'cont-020', 'paid', (CURRENT_DATE - INTERVAL '50 days')::date, (CURRENT_DATE - INTERVAL '20 days')::date, 7800.000, 0.000, 10, 780, 8580, 8580, 0, 'BHD', 'Seef Mall National Day Golden Jubilee Heritage Film', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-21', 'INV-2026-021', 'cont-021', 'paid', (CURRENT_DATE - INTERVAL '40 days')::date, (CURRENT_DATE - INTERVAL '10 days')::date, 9200.000, 0.000, 10, 920, 10120, 10120, 0, 'BHD', 'Invest in Bahrain International Roadshow Media Package', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-22', 'INV-2026-022', 'cont-022', 'paid', (CURRENT_DATE - INTERVAL '30 days')::date, (CURRENT_DATE - INTERVAL '0 days')::date, 3500.000, 0.000, 10, 350, 3850, 3850, 0, 'BHD', 'Official IAA Media Archive 4K Remastering & Restorations', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-23', 'INV-AGING-01', 'cont-023', 'overdue', (CURRENT_DATE - INTERVAL '52 days')::date, (CURRENT_DATE - INTERVAL '22 days')::date, 6200.000, 0.000, 10, 620, 6820, 0, 6820, 'BHD', 'BTEA Heritage Tourism Short Films (Overdue 22d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-24', 'INV-AGING-02', 'cont-024', 'overdue', (CURRENT_DATE - INTERVAL '48 days')::date, (CURRENT_DATE - INTERVAL '18 days')::date, 8400.000, 0.000, 10, 840, 9240, 0, 9240, 'BHD', 'Mumtalakat Annual Investor Presentation Video (Overdue 18d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-25', 'INV-AGING-03', 'cont-025', 'overdue', (CURRENT_DATE - INTERVAL '45 days')::date, (CURRENT_DATE - INTERVAL '15 days')::date, 5100.000, 0.000, 10, 510, 5610, 0, 5610, 'BHD', 'Al Baraka Global Islamic Banking Documentary (Overdue 15d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-26', 'INV-AGING-04', 'cont-026', 'overdue', (CURRENT_DATE - INTERVAL '42 days')::date, (CURRENT_DATE - INTERVAL '12 days')::date, 4300.000, 0.000, 10, 430, 4730, 0, 4730, 'BHD', 'Gulf Air Falcon Miles Rewards Program Promo (Overdue 12d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-27', 'INV-AGING-05', 'cont-027', 'overdue', (CURRENT_DATE - INTERVAL '40 days')::date, (CURRENT_DATE - INTERVAL '10 days')::date, 3700.000, 0.000, 10, 370, 4070, 0, 4070, 'BHD', 'Bahrain Duty Free Summer Golden Ticket Campaign (Overdue 10d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-28', 'INV-AGING-06', 'cont-028', 'overdue', (CURRENT_DATE - INTERVAL '82 days')::date, (CURRENT_DATE - INTERVAL '52 days')::date, 3900.000, 0.000, 10, 390, 4290, 0, 4290, 'BHD', 'Jumeirah Gulf of Bahrain Private Villa Aerial Rigging (Overdue 52d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-29', 'INV-AGING-07', 'cont-029', 'overdue', (CURRENT_DATE - INTERVAL '80 days')::date, (CURRENT_DATE - INTERVAL '50 days')::date, 6500.000, 0.000, 10, 650, 7150, 0, 7150, 'BHD', 'Ogilvy Luxury Automotive Commercial Soundstage Rental (Overdue 50d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-30', 'INV-AGING-08', 'cont-030', 'overdue', (CURRENT_DATE - INTERVAL '77 days')::date, (CURRENT_DATE - INTERVAL '47 days')::date, 5800.000, 0.000, 10, 580, 6380, 0, 6380, 'BHD', 'FP7 McCann Telecommunications TVC Post Production (Overdue 47d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-31', 'INV-AGING-09', 'cont-031', 'overdue', (CURRENT_DATE - INTERVAL '75 days')::date, (CURRENT_DATE - INTERVAL '45 days')::date, 4200.000, 0.000, 10, 420, 4620, 0, 4620, 'BHD', 'Leo Burnett Regional Bank Social Media Animation Package (Overdue 45d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-32', 'INV-AGING-10', 'cont-032', 'overdue', (CURRENT_DATE - INTERVAL '72 days')::date, (CURRENT_DATE - INTERVAL '42 days')::date, 3100.000, 0.000, 10, 310, 3410, 0, 3410, 'BHD', 'TBWA Raad FinTech Explainer Series Sound Mix (Overdue 42d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-33', 'INV-AGING-11', 'cont-033', 'overdue', (CURRENT_DATE - INTERVAL '112 days')::date, (CURRENT_DATE - INTERVAL '82 days')::date, 4700.000, 0.000, 10, 470, 5170, 0, 5170, 'BHD', 'Al Hawaj Perfume Luxury Brand Story 8K Video (Overdue 82d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-34', 'INV-AGING-12', 'cont-034', 'overdue', (CURRENT_DATE - INTERVAL '110 days')::date, (CURRENT_DATE - INTERVAL '80 days')::date, 2900.000, 0.000, 10, 290, 3190, 0, 3190, 'BHD', 'Almoayyed Electronics Showroom Grand Opening Coverage (Overdue 80d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-35', 'INV-AGING-13', 'cont-035', 'overdue', (CURRENT_DATE - INTERVAL '107 days')::date, (CURRENT_DATE - INTERVAL '77 days')::date, 9800.000, 0.000, 10, 980, 10780, 0, 10780, 'BHD', 'E.K. Kanoo Lexus Hybrid Experience Film Production (Overdue 77d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-36', 'INV-AGING-14', 'cont-001', 'overdue', (CURRENT_DATE - INTERVAL '105 days')::date, (CURRENT_DATE - INTERVAL '75 days')::date, 3400.000, 0.000, 10, 340, 3740, 0, 3740, 'BHD', 'BIC Drag Racing Night Event Wireless Video System (Overdue 75d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-37', 'INV-AGING-15', 'cont-002', 'overdue', (CURRENT_DATE - INTERVAL '102 days')::date, (CURRENT_DATE - INTERVAL '72 days')::date, 6100.000, 0.000, 10, 610, 6710, 0, 6710, 'BHD', 'Falcon Airways Pilot Training VR Simulation Backgrounds (Overdue 72d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-38', 'INV-AGING-16', 'cont-003', 'overdue', (CURRENT_DATE - INTERVAL '152 days')::date, (CURRENT_DATE - INTERVAL '122 days')::date, 7300.000, 0.000, 10, 730, 8030, 0, 8030, 'BHD', 'EWB Global Logistics Expo Pre-Roll Cinematography (Overdue 122d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-39', 'INV-AGING-17', 'cont-004', 'overdue', (CURRENT_DATE - INTERVAL '148 days')::date, (CURRENT_DATE - INTERVAL '118 days')::date, 2400.000, 0.000, 10, 240, 2640, 0, 2640, 'BHD', 'HNB Corporate Governance Boardroom Recording (Overdue 118d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-40', 'INV-AGING-18', 'cont-005', 'overdue', (CURRENT_DATE - INTERVAL '144 days')::date, (CURRENT_DATE - INTERVAL '114 days')::date, 4600.000, 0.000, 10, 460, 5060, 0, 5060, 'BHD', 'Gulfwave Fiber Rollout Documentary Series Part 1 (Overdue 114d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-41', 'INV-AGING-19', 'cont-006', 'overdue', (CURRENT_DATE - INTERVAL '140 days')::date, (CURRENT_DATE - INTERVAL '110 days')::date, 3800.000, 0.000, 10, 380, 4180, 0, 4180, 'BHD', 'Bapco Historical Refinery Heritage Archive Ingest (Overdue 110d)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-42', 'INV-PART-01', 'cont-007', 'partially_paid', (CURRENT_DATE - INTERVAL '65 days')::date, (CURRENT_DATE - INTERVAL '35 days')::date, 8000.000, 0.000, 10, 800, 8800, 4400, 4400, 'BHD', 'Alba Safety First Induction Cinema Video (Phase 1 50% Paid)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-43', 'INV-PART-02', 'cont-008', 'partially_paid', (CURRENT_DATE - INTERVAL '58 days')::date, (CURRENT_DATE - INTERVAL '28 days')::date, 6000.000, 0.000, 10, 600, 6600, 3300, 3300, 'BHD', 'Beyon Telecom Retail Experience Animation Package (50% Paid)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-44', 'INV-PART-03', 'cont-009', 'partially_paid', (CURRENT_DATE - INTERVAL '50 days')::date, (CURRENT_DATE - INTERVAL '20 days')::date, 5400.000, 0.000, 10, 540, 5940, 2970, 2970, 'BHD', 'STC Cyber Defense Lab Corporate Explainers (50% Paid)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-45', 'INV-PART-04', 'cont-010', 'partially_paid', (CURRENT_DATE - INTERVAL '45 days')::date, (CURRENT_DATE - INTERVAL '15 days')::date, 9000.000, 0.000, 10, 900, 9900, 4950, 4950, 'BHD', 'NBB Ramadan Charitable Foundation Short Films (50% Paid)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-46', 'INV-PART-05', 'cont-011', 'partially_paid', (CURRENT_DATE - INTERVAL '14 days')::date, (CURRENT_DATE + INTERVAL '16 days')::date, 7000.000, 0.000, 10, 700, 7700, 3850, 3850, 'BHD', 'BBK Youth Savings Account TVC Commercial (50% Advance Paid)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-47', 'INV-PART-06', 'cont-014', 'partially_paid', (CURRENT_DATE - INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '20 days')::date, 11000.000, 0.000, 10, 1100, 12100, 3630, 8470, 'BHD', 'Marassi Galleria Luxury Fashion Shoot (30% Deposit Paid)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-48', 'INV-PART-07', 'cont-016', 'partially_paid', (CURRENT_DATE - INTERVAL '6 days')::date, (CURRENT_DATE + INTERVAL '24 days')::date, 6500.000, 0.000, 10, 650, 7150, 3575, 3575, 'BHD', 'Four Seasons Wedding Showcase 8K Production (50% Booking Advance)', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-49', 'INV-CURR-01', 'cont-017', 'sent', (CURRENT_DATE - INTERVAL '8 days')::date, (CURRENT_DATE + INTERVAL '22 days')::date, 4800.000, 0.000, 10, 480, 5280, 0, 5280, 'BHD', 'Ritz-Carlton Seafood Festival Promos & Social Cutdowns', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-50', 'INV-CURR-02', 'cont-021', 'sent', (CURRENT_DATE - INTERVAL '6 days')::date, (CURRENT_DATE + INTERVAL '24 days')::date, 8600.000, 0.000, 10, 860, 9460, 0, 9460, 'BHD', 'Bahrain EDB International Tech Summit Recap Video', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-51', 'INV-CURR-03', 'cont-029', 'sent', (CURRENT_DATE - INTERVAL '4 days')::date, (CURRENT_DATE + INTERVAL '26 days')::date, 12500.000, 0.000, 10, 1250, 13750, 0, 13750, 'BHD', 'Ogilvy FMCG National Brand Commercial 4K Master', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-52', 'INV-CURR-04', 'cont-034', 'sent', (CURRENT_DATE - INTERVAL '3 days')::date, (CURRENT_DATE + INTERVAL '27 days')::date, 3800.000, 0.000, 10, 380, 4180, 0, 4180, 'BHD', 'Almoayyed Motors Commercial Fleet Photography', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-53', 'INV-CURR-05', 'cont-035', 'sent', (CURRENT_DATE - INTERVAL '1 days')::date, (CURRENT_DATE + INTERVAL '29 days')::date, 15000.000, 0.000, 10, 1500, 16500, 0, 16500, 'BHD', 'Toyota Land Cruiser Desert Adventure TVC Principal Photography', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-54', 'INV-DRAFT-01', 'cont-002', 'draft', (CURRENT_DATE - INTERVAL '2 days')::date, (CURRENT_DATE + INTERVAL '30 days')::date, 18000.000, 0.000, 10, 1800, 19800, 0, 19800, 'BHD', 'Falcon Airways Boeing 787 Interior Virtual Reality Tour', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)
VALUES ('inv-55', 'INV-DRAFT-02', 'cont-005', 'draft', (CURRENT_DATE - INTERVAL '1 days')::date, (CURRENT_DATE + INTERVAL '30 days')::date, 9500.000, 0.000, 10, 950, 10450, 0, 10450, 'BHD', 'Gulfwave Smart Cities IoT Showcase Film Series', 'Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-001', 'inv-01', 'F1 Season Opener Trackside Cinematography & FPV Rigging — Principal Filming & Crew', 1, 3510, 3510, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-002', 'inv-01', 'F1 Season Opener Trackside Cinematography & FPV Rigging — 8K RAW Editing, Color Grading & Sound Master', 1, 1890, 1890, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-003', 'inv-02', 'Falcon Airways Fleet Refresh In-Flight Safety Master 4K — Principal Filming & Crew', 1, 5720, 5720, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-004', 'inv-02', 'Falcon Airways Fleet Refresh In-Flight Safety Master 4K — 8K RAW Editing, Color Grading & Sound Master', 1, 3080, 3080, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-005', 'inv-03', 'Exhibition World Inaugural Summit Multi-Camera Livestream — Principal Filming & Crew', 1, 7800, 7800, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-006', 'inv-03', 'Exhibition World Inaugural Summit Multi-Camera Livestream — 8K RAW Editing, Color Grading & Sound Master', 1, 4200, 4200, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-007', 'inv-04', 'Digital Banking Mobile App Launch Teasers & Cinema Cutdowns — Principal Filming & Crew', 1, 4680, 4680, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-008', 'inv-04', 'Digital Banking Mobile App Launch Teasers & Cinema Cutdowns — 8K RAW Editing, Color Grading & Sound Master', 1, 2520, 2520, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-009', 'inv-05', 'Gulfwave 5G Network Ultra-HD Commercial TVC Production — Principal Filming & Crew', 1, 6175, 6175, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-010', 'inv-05', 'Gulfwave 5G Network Ultra-HD Commercial TVC Production — 8K RAW Editing, Color Grading & Sound Master', 1, 3325, 3325, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-011', 'inv-06', 'Bapco Energies Sustainability Docu-Feature (Phase 1) — Principal Filming & Crew', 1, 4160, 4160, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-012', 'inv-06', 'Bapco Energies Sustainability Docu-Feature (Phase 1) — 8K RAW Editing, Color Grading & Sound Master', 1, 2240, 2240, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-013', 'inv-07', 'Alba Line 6 Smelter Industrial Hyperlapse & Drone Photography — Principal Filming & Crew', 1, 3120, 3120, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-014', 'inv-07', 'Alba Line 6 Smelter Industrial Hyperlapse & Drone Photography — 8K RAW Editing, Color Grading & Sound Master', 1, 1680, 1680, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-015', 'inv-08', 'Beyon Digital Campus Architectural Tour & 360 Experience — Principal Filming & Crew', 1, 2730, 2730, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-016', 'inv-08', 'Beyon Digital Campus Architectural Tour & 360 Experience — 8K RAW Editing, Color Grading & Sound Master', 1, 1470, 1470, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-017', 'inv-09', 'STC Winter Festival Drone Light Show Video Production — Principal Filming & Crew', 1, 2535, 2535, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-018', 'inv-09', 'STC Winter Festival Drone Light Show Video Production — 8K RAW Editing, Color Grading & Sound Master', 1, 1365, 1365, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-019', 'inv-10', 'National Bank of Bahrain 65th Anniversary Film Mastering — Principal Filming & Crew', 1, 9425, 9425, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-020', 'inv-10', 'National Bank of Bahrain 65th Anniversary Film Mastering — 8K RAW Editing, Color Grading & Sound Master', 1, 5075, 5075, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-021', 'inv-11', 'BBK Super Saver Campaign Social Cutdowns & Audio Mastering — Principal Filming & Crew', 1, 2080, 2080, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-022', 'inv-11', 'BBK Super Saver Campaign Social Cutdowns & Audio Mastering — 8K RAW Editing, Color Grading & Sound Master', 1, 1120, 1120, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-023', 'inv-12', 'Ahli United Bank Private Wealth Summit Documentaries — Principal Filming & Crew', 1, 3640, 3640, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-024', 'inv-12', 'Ahli United Bank Private Wealth Summit Documentaries — 8K RAW Editing, Color Grading & Sound Master', 1, 1960, 1960, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-025', 'inv-13', 'FinTech Acceleration Demo Day Highlights & Founder Spotlights — Principal Filming & Crew', 1, 1820, 1820, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-026', 'inv-13', 'FinTech Acceleration Demo Day Highlights & Founder Spotlights — 8K RAW Editing, Color Grading & Sound Master', 1, 980, 980, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-027', 'inv-14', 'Marassi Beachfront Lifestyle Cinematography Package — Principal Filming & Crew', 1, 5330, 5330, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-028', 'inv-14', 'Marassi Beachfront Lifestyle Cinematography Package — 8K RAW Editing, Color Grading & Sound Master', 1, 2870, 2870, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-029', 'inv-15', 'Dilmunia Canal Promenade Sunset Time-Lapse & Drone Survey — Principal Filming & Crew', 1, 2340, 2340, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-030', 'inv-15', 'Dilmunia Canal Promenade Sunset Time-Lapse & Drone Survey — 8K RAW Editing, Color Grading & Sound Master', 1, 1260, 1260, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-031', 'inv-16', 'Four Seasons Bahrain Bay Gourmet Culinary Masterclass Series — Principal Filming & Crew', 1, 2925, 2925, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-032', 'inv-16', 'Four Seasons Bahrain Bay Gourmet Culinary Masterclass Series — 8K RAW Editing, Color Grading & Sound Master', 1, 1575, 1575, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-033', 'inv-17', 'Ritz-Carlton Beach Resort Summer Campaign Commercials — Principal Filming & Crew', 1, 4420, 4420, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-034', 'inv-17', 'Ritz-Carlton Beach Resort Summer Campaign Commercials — 8K RAW Editing, Color Grading & Sound Master', 1, 2380, 2380, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-035', 'inv-18', 'Dana Mall Family Shopping Festival Promo Spots — Principal Filming & Crew', 1, 1430, 1430, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-036', 'inv-18', 'Dana Mall Family Shopping Festival Promo Spots — 8K RAW Editing, Color Grading & Sound Master', 1, 770, 770, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-037', 'inv-19', 'City Centre Bahrain Fashion Weekend 4K Highlights & TVC — Principal Filming & Crew', 1, 3315, 3315, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-038', 'inv-19', 'City Centre Bahrain Fashion Weekend 4K Highlights & TVC — 8K RAW Editing, Color Grading & Sound Master', 1, 1785, 1785, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-039', 'inv-20', 'Seef Mall National Day Golden Jubilee Heritage Film — Principal Filming & Crew', 1, 5070, 5070, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-040', 'inv-20', 'Seef Mall National Day Golden Jubilee Heritage Film — 8K RAW Editing, Color Grading & Sound Master', 1, 2730, 2730, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-041', 'inv-21', 'Invest in Bahrain International Roadshow Media Package — Principal Filming & Crew', 1, 5980, 5980, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-042', 'inv-21', 'Invest in Bahrain International Roadshow Media Package — 8K RAW Editing, Color Grading & Sound Master', 1, 3220, 3220, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-043', 'inv-22', 'Official IAA Media Archive 4K Remastering & Restorations — Principal Filming & Crew', 1, 2275, 2275, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-044', 'inv-22', 'Official IAA Media Archive 4K Remastering & Restorations — 8K RAW Editing, Color Grading & Sound Master', 1, 1225, 1225, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-045', 'inv-23', 'BTEA Heritage Tourism Short Films (Overdue 22d) — Principal Filming & Crew', 1, 4030, 4030, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-046', 'inv-23', 'BTEA Heritage Tourism Short Films (Overdue 22d) — 8K RAW Editing, Color Grading & Sound Master', 1, 2170, 2170, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-047', 'inv-24', 'Mumtalakat Annual Investor Presentation Video (Overdue 18d) — Principal Filming & Crew', 1, 5460, 5460, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-048', 'inv-24', 'Mumtalakat Annual Investor Presentation Video (Overdue 18d) — 8K RAW Editing, Color Grading & Sound Master', 1, 2940, 2940, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-049', 'inv-25', 'Al Baraka Global Islamic Banking Documentary (Overdue 15d) — Principal Filming & Crew', 1, 3315, 3315, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-050', 'inv-25', 'Al Baraka Global Islamic Banking Documentary (Overdue 15d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1785, 1785, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-051', 'inv-26', 'Gulf Air Falcon Miles Rewards Program Promo (Overdue 12d) — Principal Filming & Crew', 1, 2795, 2795, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-052', 'inv-26', 'Gulf Air Falcon Miles Rewards Program Promo (Overdue 12d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1505, 1505, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-053', 'inv-27', 'Bahrain Duty Free Summer Golden Ticket Campaign (Overdue 10d) — Principal Filming & Crew', 1, 2405, 2405, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-054', 'inv-27', 'Bahrain Duty Free Summer Golden Ticket Campaign (Overdue 10d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1295, 1295, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-055', 'inv-28', 'Jumeirah Gulf of Bahrain Private Villa Aerial Rigging (Overdue 52d) — Principal Filming & Crew', 1, 2535, 2535, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-056', 'inv-28', 'Jumeirah Gulf of Bahrain Private Villa Aerial Rigging (Overdue 52d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1365, 1365, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-057', 'inv-29', 'Ogilvy Luxury Automotive Commercial Soundstage Rental (Overdue 50d) — Principal Filming & Crew', 1, 4225, 4225, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-058', 'inv-29', 'Ogilvy Luxury Automotive Commercial Soundstage Rental (Overdue 50d) — 8K RAW Editing, Color Grading & Sound Master', 1, 2275, 2275, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-059', 'inv-30', 'FP7 McCann Telecommunications TVC Post Production (Overdue 47d) — Principal Filming & Crew', 1, 3770, 3770, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-060', 'inv-30', 'FP7 McCann Telecommunications TVC Post Production (Overdue 47d) — 8K RAW Editing, Color Grading & Sound Master', 1, 2030, 2030, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-061', 'inv-31', 'Leo Burnett Regional Bank Social Media Animation Package (Overdue 45d) — Principal Filming & Crew', 1, 2730, 2730, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-062', 'inv-31', 'Leo Burnett Regional Bank Social Media Animation Package (Overdue 45d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1470, 1470, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-063', 'inv-32', 'TBWA Raad FinTech Explainer Series Sound Mix (Overdue 42d) — Principal Filming & Crew', 1, 2015, 2015, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-064', 'inv-32', 'TBWA Raad FinTech Explainer Series Sound Mix (Overdue 42d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1085, 1085, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-065', 'inv-33', 'Al Hawaj Perfume Luxury Brand Story 8K Video (Overdue 82d) — Principal Filming & Crew', 1, 3055, 3055, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-066', 'inv-33', 'Al Hawaj Perfume Luxury Brand Story 8K Video (Overdue 82d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1645, 1645, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-067', 'inv-34', 'Almoayyed Electronics Showroom Grand Opening Coverage (Overdue 80d) — Principal Filming & Crew', 1, 1885, 1885, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-068', 'inv-34', 'Almoayyed Electronics Showroom Grand Opening Coverage (Overdue 80d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1015, 1015, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-069', 'inv-35', 'E.K. Kanoo Lexus Hybrid Experience Film Production (Overdue 77d) — Principal Filming & Crew', 1, 6370, 6370, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-070', 'inv-35', 'E.K. Kanoo Lexus Hybrid Experience Film Production (Overdue 77d) — 8K RAW Editing, Color Grading & Sound Master', 1, 3430, 3430, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-071', 'inv-36', 'BIC Drag Racing Night Event Wireless Video System (Overdue 75d) — Principal Filming & Crew', 1, 2210, 2210, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-072', 'inv-36', 'BIC Drag Racing Night Event Wireless Video System (Overdue 75d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1190, 1190, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-073', 'inv-37', 'Falcon Airways Pilot Training VR Simulation Backgrounds (Overdue 72d) — Principal Filming & Crew', 1, 3965, 3965, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-074', 'inv-37', 'Falcon Airways Pilot Training VR Simulation Backgrounds (Overdue 72d) — 8K RAW Editing, Color Grading & Sound Master', 1, 2135, 2135, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-075', 'inv-38', 'EWB Global Logistics Expo Pre-Roll Cinematography (Overdue 122d) — Principal Filming & Crew', 1, 4745, 4745, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-076', 'inv-38', 'EWB Global Logistics Expo Pre-Roll Cinematography (Overdue 122d) — 8K RAW Editing, Color Grading & Sound Master', 1, 2555, 2555, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-077', 'inv-39', 'HNB Corporate Governance Boardroom Recording (Overdue 118d) — Principal Filming & Crew', 1, 1560, 1560, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-078', 'inv-39', 'HNB Corporate Governance Boardroom Recording (Overdue 118d) — 8K RAW Editing, Color Grading & Sound Master', 1, 840, 840, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-079', 'inv-40', 'Gulfwave Fiber Rollout Documentary Series Part 1 (Overdue 114d) — Principal Filming & Crew', 1, 2990, 2990, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-080', 'inv-40', 'Gulfwave Fiber Rollout Documentary Series Part 1 (Overdue 114d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1610, 1610, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-081', 'inv-41', 'Bapco Historical Refinery Heritage Archive Ingest (Overdue 110d) — Principal Filming & Crew', 1, 2470, 2470, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-082', 'inv-41', 'Bapco Historical Refinery Heritage Archive Ingest (Overdue 110d) — 8K RAW Editing, Color Grading & Sound Master', 1, 1330, 1330, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-083', 'inv-42', 'Alba Safety First Induction Cinema Video (Phase 1 50% Paid) — Principal Filming & Crew', 1, 5200, 5200, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-084', 'inv-42', 'Alba Safety First Induction Cinema Video (Phase 1 50% Paid) — 8K RAW Editing, Color Grading & Sound Master', 1, 2800, 2800, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-085', 'inv-43', 'Beyon Telecom Retail Experience Animation Package (50% Paid) — Principal Filming & Crew', 1, 3900, 3900, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-086', 'inv-43', 'Beyon Telecom Retail Experience Animation Package (50% Paid) — 8K RAW Editing, Color Grading & Sound Master', 1, 2100, 2100, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-087', 'inv-44', 'STC Cyber Defense Lab Corporate Explainers (50% Paid) — Principal Filming & Crew', 1, 3510, 3510, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-088', 'inv-44', 'STC Cyber Defense Lab Corporate Explainers (50% Paid) — 8K RAW Editing, Color Grading & Sound Master', 1, 1890, 1890, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-089', 'inv-45', 'NBB Ramadan Charitable Foundation Short Films (50% Paid) — Principal Filming & Crew', 1, 5850, 5850, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-090', 'inv-45', 'NBB Ramadan Charitable Foundation Short Films (50% Paid) — 8K RAW Editing, Color Grading & Sound Master', 1, 3150, 3150, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-091', 'inv-46', 'BBK Youth Savings Account TVC Commercial (50% Advance Paid) — Principal Filming & Crew', 1, 4550, 4550, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-092', 'inv-46', 'BBK Youth Savings Account TVC Commercial (50% Advance Paid) — 8K RAW Editing, Color Grading & Sound Master', 1, 2450, 2450, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-093', 'inv-47', 'Marassi Galleria Luxury Fashion Shoot (30% Deposit Paid) — Principal Filming & Crew', 1, 7150, 7150, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-094', 'inv-47', 'Marassi Galleria Luxury Fashion Shoot (30% Deposit Paid) — 8K RAW Editing, Color Grading & Sound Master', 1, 3850, 3850, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-095', 'inv-48', 'Four Seasons Wedding Showcase 8K Production (50% Booking Advance) — Principal Filming & Crew', 1, 4225, 4225, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-096', 'inv-48', 'Four Seasons Wedding Showcase 8K Production (50% Booking Advance) — 8K RAW Editing, Color Grading & Sound Master', 1, 2275, 2275, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-097', 'inv-49', 'Ritz-Carlton Seafood Festival Promos & Social Cutdowns — Principal Filming & Crew', 1, 3120, 3120, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-098', 'inv-49', 'Ritz-Carlton Seafood Festival Promos & Social Cutdowns — 8K RAW Editing, Color Grading & Sound Master', 1, 1680, 1680, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-099', 'inv-50', 'Bahrain EDB International Tech Summit Recap Video — Principal Filming & Crew', 1, 5590, 5590, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-100', 'inv-50', 'Bahrain EDB International Tech Summit Recap Video — 8K RAW Editing, Color Grading & Sound Master', 1, 3010, 3010, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-101', 'inv-51', 'Ogilvy FMCG National Brand Commercial 4K Master — Principal Filming & Crew', 1, 8125, 8125, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-102', 'inv-51', 'Ogilvy FMCG National Brand Commercial 4K Master — 8K RAW Editing, Color Grading & Sound Master', 1, 4375, 4375, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-103', 'inv-52', 'Almoayyed Motors Commercial Fleet Photography — Principal Filming & Crew', 1, 2470, 2470, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-104', 'inv-52', 'Almoayyed Motors Commercial Fleet Photography — 8K RAW Editing, Color Grading & Sound Master', 1, 1330, 1330, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-105', 'inv-53', 'Toyota Land Cruiser Desert Adventure TVC Principal Photography — Principal Filming & Crew', 1, 9750, 9750, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-106', 'inv-53', 'Toyota Land Cruiser Desert Adventure TVC Principal Photography — 8K RAW Editing, Color Grading & Sound Master', 1, 5250, 5250, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-107', 'inv-54', 'Falcon Airways Boeing 787 Interior Virtual Reality Tour — Principal Filming & Crew', 1, 11700, 11700, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-108', 'inv-54', 'Falcon Airways Boeing 787 Interior Virtual Reality Tour — 8K RAW Editing, Color Grading & Sound Master', 1, 6300, 6300, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-109', 'inv-55', 'Gulfwave Smart Cities IoT Showcase Film Series — Principal Filming & Crew', 1, 6175, 6175, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)
VALUES ('ii-110', 'inv-55', 'Gulfwave Smart Cities IoT Showcase Film Series — 8K RAW Editing, Color Grading & Sound Master', 1, 3325, 3325, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-001', 'RCT-2026-001', 'inv-01', 'cont-001', 5940, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '140 days')::date, 'REF-INV-2026-001-TXN2', 'completed', 'Settlement for F1 Season Opener Trackside Cinematography & FPV Rigging', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-002', 'RCT-2026-002', 'inv-02', 'cont-002', 9680, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '130 days')::date, 'REF-INV-2026-002-TXN3', 'completed', 'Settlement for Falcon Airways Fleet Refresh In-Flight Safety Master 4K', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-003', 'RCT-2026-003', 'inv-03', 'cont-003', 13200, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '131 days')::date, 'REF-INV-2026-003-TXN4', 'completed', 'Settlement for Exhibition World Inaugural Summit Multi-Camera Livestream', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-004', 'RCT-2026-004', 'inv-04', 'cont-004', 7920, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '115 days')::date, 'REF-INV-2026-004-TXN5', 'completed', 'Settlement for Digital Banking Mobile App Launch Teasers & Cinema Cutdowns', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-005', 'RCT-2026-005', 'inv-05', 'cont-005', 10450, 'BHD', 'benefit_pay', (CURRENT_DATE - INTERVAL '117 days')::date, 'REF-INV-2026-005-TXN6', 'completed', 'Settlement for Gulfwave 5G Network Ultra-HD Commercial TVC Production', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-006', 'RCT-2026-006', 'inv-06', 'cont-006', 7040, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '118 days')::date, 'REF-INV-2026-006-TXN7', 'completed', 'Settlement for Bapco Energies Sustainability Docu-Feature (Phase 1)', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-007', 'RCT-2026-007', 'inv-07', 'cont-007', 5280, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '103 days')::date, 'REF-INV-2026-007-TXN8', 'completed', 'Settlement for Alba Line 6 Smelter Industrial Hyperlapse & Drone Photography', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-008', 'RCT-2026-008', 'inv-08', 'cont-008', 4620, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '105 days')::date, 'REF-INV-2026-008-TXN9', 'completed', 'Settlement for Beyon Digital Campus Architectural Tour & 360 Experience', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-009', 'RCT-2026-009', 'inv-09', 'cont-009', 4290, 'BHD', 'credit_card', (CURRENT_DATE - INTERVAL '99 days')::date, 'REF-INV-2026-009-TXN10', 'completed', 'Settlement for STC Winter Festival Drone Light Show Video Production', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-010', 'RCT-2026-010', 'inv-10', 'cont-010', 15950, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '90 days')::date, 'REF-INV-2026-010-TXN11', 'completed', 'Settlement for National Bank of Bahrain 65th Anniversary Film Mastering', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-011', 'RCT-2026-011', 'inv-11', 'cont-011', 3520, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '91 days')::date, 'REF-INV-2026-011-TXN12', 'completed', 'Settlement for BBK Super Saver Campaign Social Cutdowns & Audio Mastering', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-012', 'RCT-2026-012', 'inv-12', 'cont-012', 6160, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '81 days')::date, 'REF-INV-2026-012-TXN13', 'completed', 'Settlement for Ahli United Bank Private Wealth Summit Documentaries', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-013', 'RCT-2026-013', 'inv-13', 'cont-013', 3080, 'BHD', 'benefit_pay', (CURRENT_DATE - INTERVAL '85 days')::date, 'REF-INV-2026-013-TXN14', 'completed', 'Settlement for FinTech Acceleration Demo Day Highlights & Founder Spotlights', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-014', 'RCT-2026-014', 'inv-14', 'cont-014', 9020, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '69 days')::date, 'REF-INV-2026-014-TXN15', 'completed', 'Settlement for Marassi Beachfront Lifestyle Cinematography Package', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-015', 'RCT-2026-015', 'inv-15', 'cont-015', 3960, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '70 days')::date, 'REF-INV-2026-015-TXN16', 'completed', 'Settlement for Dilmunia Canal Promenade Sunset Time-Lapse & Drone Survey', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-016', 'RCT-2026-016', 'inv-16', 'cont-016', 4950, 'BHD', 'credit_card', (CURRENT_DATE - INTERVAL '66 days')::date, 'REF-INV-2026-016-TXN17', 'completed', 'Settlement for Four Seasons Bahrain Bay Gourmet Culinary Masterclass Series', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-017', 'RCT-2026-017', 'inv-17', 'cont-017', 7480, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '57 days')::date, 'REF-INV-2026-017-TXN18', 'completed', 'Settlement for Ritz-Carlton Beach Resort Summer Campaign Commercials', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-018', 'RCT-2026-018', 'inv-18', 'cont-018', 2420, 'BHD', 'benefit_pay', (CURRENT_DATE - INTERVAL '58 days')::date, 'REF-INV-2026-018-TXN19', 'completed', 'Settlement for Dana Mall Family Shopping Festival Promo Spots', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-019', 'RCT-2026-019', 'inv-19', 'cont-019', 5610, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '40 days')::date, 'REF-INV-2026-019-TXN20', 'completed', 'Settlement for City Centre Bahrain Fashion Weekend 4K Highlights & TVC', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-020', 'RCT-2026-020', 'inv-20', 'cont-020', 8580, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '34 days')::date, 'REF-INV-2026-020-TXN21', 'completed', 'Settlement for Seef Mall National Day Golden Jubilee Heritage Film', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-021', 'RCT-2026-021', 'inv-21', 'cont-021', 10120, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '25 days')::date, 'REF-INV-2026-021-TXN22', 'completed', 'Settlement for Invest in Bahrain International Roadshow Media Package', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-022', 'RCT-2026-022', 'inv-22', 'cont-022', 3850, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '20 days')::date, 'REF-INV-2026-022-TXN23', 'completed', 'Settlement for Official IAA Media Archive 4K Remastering & Restorations', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-023', 'RCT-PART-01', 'inv-42', 'cont-007', 4400, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '55 days')::date, 'REF-INV-PART-01-TXN24', 'completed', 'Settlement for Alba Safety First Induction Cinema Video (Phase 1 50% Paid)', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-024', 'RCT-PART-02', 'inv-43', 'cont-008', 3300, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '48 days')::date, 'REF-INV-PART-02-TXN25', 'completed', 'Settlement for Beyon Telecom Retail Experience Animation Package (50% Paid)', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-025', 'RCT-PART-03', 'inv-44', 'cont-009', 2970, 'BHD', 'benefit_pay', (CURRENT_DATE - INTERVAL '40 days')::date, 'REF-INV-PART-03-TXN26', 'completed', 'Settlement for STC Cyber Defense Lab Corporate Explainers (50% Paid)', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-026', 'RCT-PART-04', 'inv-45', 'cont-010', 4950, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '35 days')::date, 'REF-INV-PART-04-TXN27', 'completed', 'Settlement for NBB Ramadan Charitable Foundation Short Films (50% Paid)', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-027', 'RCT-PART-05', 'inv-46', 'cont-011', 3850, 'BHD', 'benefit_pay', (CURRENT_DATE - INTERVAL '4 days')::date, 'REF-INV-PART-05-TXN28', 'completed', 'Settlement for BBK Youth Savings Account TVC Commercial (50% Advance Paid)', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-028', 'RCT-PART-06', 'inv-47', 'cont-014', 3630, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '0 days')::date, 'REF-INV-PART-06-TXN29', 'completed', 'Settlement for Marassi Galleria Luxury Fashion Shoot (30% Deposit Paid)', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)
VALUES ('pay-029', 'RCT-PART-07', 'inv-48', 'cont-016', 3575, 'BHD', 'credit_card', (CURRENT_DATE - INTERVAL '0 days')::date, 'REF-INV-PART-07-TXN30', 'completed', 'Settlement for Four Seasons Wedding Showcase 8K Production (50% Booking Advance)', now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. INVENTORY SERVICE (Categories, Warehouses, Locations, Products, Stock Levels)
-- ----------------------------------------------------------------------------
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)
VALUES ('cameras', 'cameras', 'Cinema Cameras & Packages', 'كاميرات السينما الاحترافية', 'Top-tier 8K & 4K full frame cinema cameras', 'كاميرات السينما الاحترافية', 1, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)
VALUES ('lenses', 'lenses', 'Anamorphic & Prime Lenses', 'عدسات أنامورفيك وبرايم', 'Cinema primes, zooms and anamorphic glass', 'عدسات أنامورفيك وبرايم', 2, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)
VALUES ('lighting', 'lighting', 'Production Lighting & Grips', 'إضاءة الإنتاج ومعدات التوزيع', 'High-output LED fixtures and tubes', 'إضاءة الإنتاج ومعدات التوزيع', 3, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)
VALUES ('audio', 'audio', 'Location Sound & Recorders', 'هندسة الصوت الميداني', 'Multi-track recorders and shotgun mics', 'هندسة الصوت الميداني', 4, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)
VALUES ('drones', 'drones-gimbals', 'Cinema Drones & Gimbals', 'الدرونز وموانع الاهتزاز', 'Heavy-lift cinema aerials and handheld 4-axis gimbals', 'الدرونز وموانع الاهتزاز', 5, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)
VALUES ('monitors', 'monitors-wireless', 'Wireless Video & HDR Monitors', 'شاشات العرض والنقل اللاسلكي', '4K zero-latency video links and mastering monitors', 'شاشات العرض والنقل اللاسلكي', 6, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)
VALUES ('grip', 'heavy-grip', 'Studio Jibs, Tripods & Grips', 'حوامل ورافعات الاستوديو', 'Fluid heads, C-stands, dollies and jibs', 'حوامل ورافعات الاستوديو', 7, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)
VALUES ('post', 'post-storage', 'Post-Production Workstations', 'محطات المونتاج والتلوين', 'High-speed NVMe storage and DCI grading suites', 'محطات المونتاج والتلوين', 8, true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.warehouse (id, code, name_en, name_ar, address, is_active, is_default, sort_order, created_at, updated_at)
VALUES ('3a2939ad-f352-4fe0-a639-935422fe3f29', 'DEMO', 'Main Cinema Equipment Vault', 'مخزن المعدات السينمائية الرئيسي', 'Seef District, Manama, Kingdom of Bahrain', true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.warehouse (id, code, name_en, name_ar, address, is_active, is_default, sort_order, created_at, updated_at)
VALUES ('7da571bc-d198-4fcf-92d6-b0a03637ed4d', 'STUDIO', 'Seef Soundstage & Studio Vault', 'مخزن استوديو السيف السينمائي', 'Seef District, Kingdom of Bahrain', true, false, 2, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_location (id, warehouse_id, code, name, is_active, created_at)
VALUES ('9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', '3a2939ad-f352-4fe0-a639-935422fe3f29', 'VAULT-01', 'Primary Gear Vault', true, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_location (id, warehouse_id, code, name, is_active, created_at)
VALUES ('c0121511-2fba-4bbd-8a68-ffb3ba9f566b', '7da571bc-d198-4fcf-92d6-b0a03637ed4d', 'STUDIO-BAY', 'Stage Lighting & Rigging Bay', true, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-cam-alx-35', 'CAM-ALX-35', 'ARRI Alexa 35 Camera Package', 'كاميرا آري أليكسا 35 سينمائية', 'ARRI Alexa 35 Camera Package', 'كاميرا آري أليكسا 35 سينمائية', 'cameras', 18000.0000, 350.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-cam-alx-35', 'prod-cam-alx-35', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-cam-alx-35', 'prod-cam-alx-35', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 18000.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-cam-alx-lf', 'CAM-ALX-LF', 'ARRI Alexa Mini LF Production Kit', 'كاميرا آري أليكسا ميني إل إف', 'ARRI Alexa Mini LF Production Kit', 'كاميرا آري أليكسا ميني إل إف', 'cameras', 14000.0000, 280.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-cam-alx-lf', 'prod-cam-alx-lf', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-cam-alx-lf', 'prod-cam-alx-lf', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 14000.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-cam-red-rap', 'CAM-RED-RAP', 'RED V-Raptor 8K VV Cinema Package', 'كاميرا ريد في-رابتور 8K سينمائية', 'RED V-Raptor 8K VV Cinema Package', 'كاميرا ريد في-رابتور 8K سينمائية', 'cameras', 9500.0000, 220.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-cam-red-rap', 'prod-cam-red-rap', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-cam-red-rap', 'prod-cam-red-rap', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 9500.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-cam-sny-fx9', 'CAM-SNY-FX9', 'Sony FX9 Full-Frame Cinema Kit', 'كاميرا سوني FX9 سينمائية متكاملة', 'Sony FX9 Full-Frame Cinema Kit', 'كاميرا سوني FX9 سينمائية متكاملة', 'cameras', 4200.0000, 120.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-cam-sny-fx9', 'prod-cam-sny-fx9', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-cam-sny-fx9', 'prod-cam-sny-fx9', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 4200.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-cam-sny-fx3', 'CAM-SNY-FX3', 'Sony FX3 B-Camera Production Rig', 'كاميرا سوني FX3 المحمولة', 'Sony FX3 B-Camera Production Rig', 'كاميرا سوني FX3 المحمولة', 'cameras', 1600.0000, 65.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-cam-sny-fx3', 'prod-cam-sny-fx3', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-cam-sny-fx3', 'prod-cam-sny-fx3', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 1600.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lns-cok-set', 'LNS-COK-SET', 'Cooke Anamorphic/i Full Frame Plus Set (5 Lenses)', 'طقم عدسات كوك أنامورفيك فل فريم (5 عدسات)', 'Cooke Anamorphic/i Full Frame Plus Set (5 Lenses)', 'طقم عدسات كوك أنامورفيك فل فريم (5 عدسات)', 'lenses', 24000.0000, 450.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lns-cok-set', 'prod-lns-cok-set', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lns-cok-set', 'prod-lns-cok-set', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 24000.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lns-ari-35t', 'LNS-ARI-35T', 'ARRI Signature Prime 35mm T1.8 Lens', 'عدسة آري سيغنتشر برايم 35 ملم', 'ARRI Signature Prime 35mm T1.8 Lens', 'عدسة آري سيغنتشر برايم 35 ملم', 'lenses', 7200.0000, 110.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lns-ari-35t', 'prod-lns-ari-35t', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lns-ari-35t', 'prod-lns-ari-35t', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 7200.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lns-zes-50t', 'LNS-ZES-50T', 'Zeiss Supreme Prime 50mm T1.5 Lens', 'عدسة زايس سوبريم برايم 50 ملم', 'Zeiss Supreme Prime 50mm T1.5 Lens', 'عدسة زايس سوبريم برايم 50 ملم', 'lenses', 5800.0000, 95.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lns-zes-50t', 'prod-lns-zes-50t', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lns-zes-50t', 'prod-lns-zes-50t', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 5800.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lns-ang-opt', 'LNS-ANG-OPT', 'Angenieux Optimo Ultra 12x Cinema Zoom Lens', 'عدسة تقريب سينمائية آنجينو أوبتيمو 12x', 'Angenieux Optimo Ultra 12x Cinema Zoom Lens', 'عدسة تقريب سينمائية آنجينو أوبتيمو 12x', 'lenses', 16500.0000, 320.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lns-ang-opt', 'prod-lns-ang-opt', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lns-ang-opt', 'prod-lns-ang-opt', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 16500.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lns-cn-2470', 'LNS-CN-2470', 'Canon CN-E Cinema Prime Lens Kit', 'طقم عدسات كانون سينمائية برايم', 'Canon CN-E Cinema Prime Lens Kit', 'طقم عدسات كانون سينمائية برايم', 'lenses', 4500.0000, 85.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lns-cn-2470', 'prod-lns-cn-2470', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lns-cn-2470', 'prod-lns-cn-2470', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 4500.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lgt-apt-2600', 'LGT-APT-2600', 'Aputure Electro Storm XT26 2600W Point-Source LED', 'إضاءة أبوتر إلكترو ستورم 2600 واط', 'Aputure Electro Storm XT26 2600W Point-Source LED', 'إضاءة أبوتر إلكترو ستورم 2600 واط', 'lighting', 2800.0000, 75.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lgt-apt-2600', 'prod-lgt-apt-2600', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lgt-apt-2600', 'prod-lgt-apt-2600', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 2800.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lgt-ari-skyx', 'LGT-ARI-SKYX', 'ARRI SkyPanel X21 High-Output LED Softlight', 'إضاءة آري سكاي بانل إكس21 سوفت لايت', 'ARRI SkyPanel X21 High-Output LED Softlight', 'إضاءة آري سكاي بانل إكس21 سوفت لايت', 'lighting', 3400.0000, 90.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lgt-ari-skyx', 'prod-lgt-ari-skyx', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lgt-ari-skyx', 'prod-lgt-ari-skyx', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 3400.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lgt-ast-tit8', 'LGT-AST-TIT8', 'Astera Titan Tube 8-Light Wireless LED Kit', 'طقم أنابيب أستيرا تيتان 8 وحدات لاسلكية', 'Astera Titan Tube 8-Light Wireless LED Kit', 'طقم أنابيب أستيرا تيتان 8 وحدات لاسلكية', 'lighting', 2100.0000, 60.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lgt-ast-tit8', 'prod-lgt-ast-tit8', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lgt-ast-tit8', 'prod-lgt-ast-tit8', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 2100.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lgt-nan-720b', 'LGT-NAN-720B', 'Nanlite Forza 720B Bi-Color Spot Light', 'إضاءة نانلايت فورزا 720B ثنائية اللون', 'Nanlite Forza 720B Bi-Color Spot Light', 'إضاءة نانلايت فورزا 720B ثنائية اللون', 'lighting', 1200.0000, 45.0000, 'BHD', 10.00, true, true, 3.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lgt-nan-720b', 'prod-lgt-nan-720b', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 3.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lgt-nan-720b', 'prod-lgt-nan-720b', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 1200.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-lgt-kof-l100', 'LGT-KOF-L100', 'Kino Flo FreeStyle 31 LED DMX Production Light', 'إضاءة كينو فلو فري ستايل ستوديو', 'Kino Flo FreeStyle 31 LED DMX Production Light', 'إضاءة كينو فلو فري ستايل ستوديو', 'lighting', 1800.0000, 55.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-lgt-kof-l100', 'prod-lgt-kof-l100', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-lgt-kof-l100', 'prod-lgt-kof-l100', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 1800.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-aud-snd-888', 'AUD-SND-888', 'Sound Devices 888 16-Channel 20-Track Field Recorder', 'جهاز تسجيل صوتي ميداني ساوند ديفايسز 888', 'Sound Devices 888 16-Channel 20-Track Field Recorder', 'جهاز تسجيل صوتي ميداني ساوند ديفايسز 888', 'audio', 3200.0000, 80.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-aud-snd-888', 'prod-aud-snd-888', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-aud-snd-888', 'prod-aud-snd-888', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 3200.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-aud-snh-416', 'AUD-SNH-416', 'Sennheiser MKH 416 Moisture-Resistant Shotgun Mic', 'ميكروفون شوتجن سيمهايزر MKH 416', 'Sennheiser MKH 416 Moisture-Resistant Shotgun Mic', 'ميكروفون شوتجن سيمهايزر MKH 416', 'audio', 450.0000, 25.0000, 'BHD', 10.00, true, true, 4.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-aud-snh-416', 'prod-aud-snh-416', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 4.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-aud-snh-416', 'prod-aud-snh-416', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 450.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-aud-wsy-dual', 'AUD-WSY-DUAL', 'Wisycom Wireless Dual Receiver & Bodypack Mic Kit', 'طقم ميكروفونات لاسلكية ويزيكوم احترافية', 'Wisycom Wireless Dual Receiver & Bodypack Mic Kit', 'طقم ميكروفونات لاسلكية ويزيكوم احترافية', 'audio', 2600.0000, 70.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-aud-wsy-dual', 'prod-aud-wsy-dual', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-aud-wsy-dual', 'prod-aud-wsy-dual', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 2600.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-aud-lec-smwb', 'AUD-LEC-SMWB', 'Lectrosonics Wideband Wireless Transmitter System', 'جهاز إرسال لاسلكي لكتروسونيكس', 'Lectrosonics Wideband Wireless Transmitter System', 'جهاز إرسال لاسلكي لكتروسونيكس', 'audio', 1800.0000, 50.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-aud-lec-smwb', 'prod-aud-lec-smwb', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-aud-lec-smwb', 'prod-aud-lec-smwb', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 1800.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-drn-dji-ins3', 'DRN-DJI-INS3', 'DJI Inspire 3 Cinema Drone with Zenmuse X9-8K Air', 'طائرة درون سينمائية دي جيه آي إنسباير 3 بدقة 8K', 'DJI Inspire 3 Cinema Drone with Zenmuse X9-8K Air', 'طائرة درون سينمائية دي جيه آي إنسباير 3 بدقة 8K', 'drones', 4800.0000, 160.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-drn-dji-ins3', 'prod-drn-dji-ins3', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-drn-dji-ins3', 'prod-drn-dji-ins3', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 4800.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-gmb-dji-4d8k', 'GMB-DJI-4D8K', 'DJI Ronin 4D 8K 4-Axis Cinema Gimbal Camera', 'مانع اهتزاز سينمائي دي جيه آي رونين 4D رباعي المحاور', 'DJI Ronin 4D 8K 4-Axis Cinema Gimbal Camera', 'مانع اهتزاز سينمائي دي جيه آي رونين 4D رباعي المحاور', 'drones', 3600.0000, 120.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-gmb-dji-4d8k', 'prod-gmb-dji-4d8k', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-gmb-dji-4d8k', 'prod-gmb-dji-4d8k', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 3600.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-gmb-frf-movi', 'GMB-FRF-MOVI', 'Freefly MōVI Pro Motorized Cinema Gimbal Stabilizer', 'مانع اهتزاز سينمائي فريفلاي موفي برو', 'Freefly MōVI Pro Motorized Cinema Gimbal Stabilizer', 'مانع اهتزاز سينمائي فريفلاي موفي برو', 'drones', 2400.0000, 85.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-gmb-frf-movi', 'prod-gmb-frf-movi', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-gmb-frf-movi', 'prod-gmb-frf-movi', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 2400.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-mon-trd-4kmx', 'MON-TRD-4KMX', 'Teradek Bolt 4K MAX 12G-SDI Wireless Video System', 'نظام نقل فيديو لاسلكي تيراديك بولت 4K ماكس', 'Teradek Bolt 4K MAX 12G-SDI Wireless Video System', 'نظام نقل فيديو لاسلكي تيراديك بولت 4K ماكس', 'monitors', 4500.0000, 95.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-mon-trd-4kmx', 'prod-mon-trd-4kmx', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-mon-trd-4kmx', 'prod-mon-trd-4kmx', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 4500.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-mon-smh-18in', 'MON-SMH-18IN', 'SmallHD Cine 18 4K High-Bright Production Monitor', 'شاشة مراقبة إنتاجية سمول إتش دي 18 بوصة 4K', 'SmallHD Cine 18 4K High-Bright Production Monitor', 'شاشة مراقبة إنتاجية سمول إتش دي 18 بوصة 4K', 'monitors', 2100.0000, 60.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-mon-smh-18in', 'prod-mon-smh-18in', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-mon-smh-18in', 'prod-mon-smh-18in', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 2100.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-mon-sny-hx31', 'MON-SNY-HX31', 'Sony BVM-HX310 31-inch 4K HDR Reference Master Monitor', 'شاشة مرجعية سوني 31 بوصة لتصحيح الألوان 4K HDR', 'Sony BVM-HX310 31-inch 4K HDR Reference Master Monitor', 'شاشة مرجعية سوني 31 بوصة لتصحيح الألوان 4K HDR', 'monitors', 12500.0000, 250.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-mon-sny-hx31', 'prod-mon-sny-hx31', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-mon-sny-hx31', 'prod-mon-sny-hx31', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 12500.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-grp-ezr-var5', 'GRP-EZR-VAR5', 'EasyRig Vario 5 with Cinema Gimbal Vest and Flowline', 'حزام وحامل إيزي ريج فاريو 5 سينمائي', 'EasyRig Vario 5 with Cinema Gimbal Vest and Flowline', 'حزام وحامل إيزي ريج فاريو 5 سينمائي', 'grip', 1500.0000, 40.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-grp-ezr-var5', 'prod-grp-ezr-var5', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-grp-ezr-var5', 'prod-grp-ezr-var5', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 1500.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-grp-sch-v20s', 'GRP-SCH-V20S', 'Sachtler Video 20 S1 Carbon Fiber Fluid Head Tripod', 'ترايبود ساخلر فيديو 20 احترافي كربون فايبر', 'Sachtler Video 20 S1 Carbon Fiber Fluid Head Tripod', 'ترايبود ساخلر فيديو 20 احترافي كربون فايبر', 'grip', 2900.0000, 65.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-grp-sch-v20s', 'prod-grp-sch-v20s', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-grp-sch-v20s', 'prod-grp-sch-v20s', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 2900.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-grp-mat-cst4', 'GRP-MAT-CST4', 'Matthews 40-inch C-Stand Grip Kit with Grip Head & Arm', 'طقم سي-ستاند ماثيوز 40 بوصة مع ذراع قبضة', 'Matthews 40-inch C-Stand Grip Kit with Grip Head & Arm', 'طقم سي-ستاند ماثيوز 40 بوصة مع ذراع قبضة', 'grip', 180.0000, 15.0000, 'BHD', 10.00, true, true, 8.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-grp-mat-cst4', 'prod-grp-mat-cst4', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 8.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-grp-mat-cst4', 'prod-grp-mat-cst4', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 180.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-grp-prm-jib9', 'GRP-PRM-JIB9', 'Proaim Studio Heavy-Duty 9ft Soundstage Jib Crane', 'رافعة كاميرا استوديو بروايم 9 أقدام', 'Proaim Studio Heavy-Duty 9ft Soundstage Jib Crane', 'رافعة كاميرا استوديو بروايم 9 أقدام', 'grip', 1200.0000, 50.0000, 'BHD', 10.00, true, true, 1.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-grp-prm-jib9', 'prod-grp-prm-jib9', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 1.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-grp-prm-jib9', 'prod-grp-prm-jib9', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 1200.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('prod-pst-mac-stum', 'PST-MAC-STUM', 'Apple Mac Studio M2 Ultra (128GB Unified RAM) Workstation', 'محطة مونتاج وتلوين ماك ستوديو إم2 ألترا', 'Apple Mac Studio M2 Ultra (128GB Unified RAM) Workstation', 'محطة مونتاج وتلوين ماك ستوديو إم2 ألترا', 'post', 3200.0000, 90.0000, 'BHD', 10.00, true, true, 2.00, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'prod-pst-mac-stum', 'prod-pst-mac-stum', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4.0000, 0.0000, 4.0000, 2.0000, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'prod-pst-mac-stum', 'prod-pst-mac-stum', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4.0000, 3200.0000, 'inventory', 'Initial vault intake & testing', now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. COMMERCE & DELIVERY (50 Customers & Addresses, Orders, Coupons, Fleet)
-- ----------------------------------------------------------------------------
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-001', 'Abdullah', 'Al-Khalifa', 'abdullah.alkhalifa1@example.com', '+97336000000', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-002', 'Mohammed', 'Al-Mahmood', 'mohammed.almahmood2@example.com', '+97336001111', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-003', 'Fatima', 'Al-Sayed', 'fatima.alsayed3@example.com', '+97336002222', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-004', 'Ali', 'Al-Doseri', 'ali.aldoseri4@example.com', '+97336003333', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-005', 'Zainab', 'Al-Amer', 'zainab.alamer5@example.com', '+97336004444', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-006', 'Hassan', 'Al-Ghatam', 'hassan.alghatam6@example.com', '+97336005555', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-007', 'Maryam', 'Al-Abbasi', 'maryam.alabbasi7@example.com', '+97336006666', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-008', 'Khalid', 'Al-Ansari', 'khalid.alansari8@example.com', '+97336007777', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-009', 'Noor', 'Al-Jalahma', 'noor.aljalahma9@example.com', '+97336008888', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-010', 'Hussain', 'Al-Buainain', 'hussain.albuainain10@example.com', '+97336009999', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-011', 'Ahmed', 'Al-Rowaiei', 'ahmed.alrowaiei11@example.com', '+97336011110', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-012', 'Sara', 'Al-Hammadi', 'sara.alhammadi12@example.com', '+97336012221', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-013', 'Yusuf', 'Al-Bahrani', 'yusuf.albahrani13@example.com', '+97336013332', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-014', 'Reem', 'Al-Kooheji', 'reem.alkooheji14@example.com', '+97336014443', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-015', 'Hamad', 'Al-Mutawa', 'hamad.almutawa15@example.com', '+97336015554', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-016', 'Amina', 'Al-Zayani', 'amina.alzayani16@example.com', '+97336016665', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-017', 'Salman', 'Al-Gosaibi', 'salman.algosaibi17@example.com', '+97336017776', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-018', 'Layla', 'Al-Shirawi', 'layla.alshirawi18@example.com', '+97336018887', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-019', 'Omar', 'Al-Moayyed', 'omar.almoayyed19@example.com', '+97336019998', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-020', 'Huda', 'Al-Tamimi', 'huda.altamimi20@example.com', '+97336021109', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-021', 'Jasim', 'Fakhro', 'jasim.fakhro21@example.com', '+97336022220', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-022', 'Eman', 'Kanoo', 'eman.kanoo22@example.com', '+97336023331', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-023', 'Tariq', 'Yateem', 'tariq.yateem23@example.com', '+97336024442', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-024', 'Mona', 'Balooch', 'mona.balooch24@example.com', '+97336025553', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-025', 'Faisal', 'Al-Marzooq', 'faisal.almarzooq25@example.com', '+97336026664', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-026', 'Dina', 'Al-Hassan', 'dina.alhassan26@example.com', '+97336027775', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-027', 'Nasser', 'Al-Maskati', 'nasser.almaskati27@example.com', '+97336028886', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-028', 'Lulwa', 'Al-Arrayed', 'lulwa.alarrayed28@example.com', '+97336029997', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-029', 'Bader', 'Al-Sabah', 'bader.alsabah29@example.com', '+97336031108', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-030', 'Salma', 'Al-Thani', 'salma.althani30@example.com', '+97336032219', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-031', 'Adel', 'Al-Nuaimi', 'adel.alnuaimi31@example.com', '+97336033330', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-032', 'Haya', 'Al-Kaabi', 'haya.alkaabi32@example.com', '+97336034441', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-033', 'Mustafa', 'Al-Shurooqi', 'mustafa.alshurooqi33@example.com', '+97336035552', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-034', 'Rania', 'Al-Hamar', 'rania.alhamar34@example.com', '+97336036663', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-035', 'Waleed', 'Al-Sharif', 'waleed.alsharif35@example.com', '+97336037774', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-036', 'Shaikha', 'Al-Najjar', 'shaikha.alnajjar36@example.com', '+97336038885', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-037', 'Mahmood', 'Al-Madani', 'mahmood.almadani37@example.com', '+97336039996', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-038', 'Rawan', 'Al-Banna', 'rawan.albanna38@example.com', '+97336041107', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-039', 'Saud', 'Al-Tajer', 'saud.altajer39@example.com', '+97336042218', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-040', 'Dana', 'Al-Khatib', 'dana.alkhatib40@example.com', '+97336043329', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-041', 'Ziyad', 'Sultan', 'ziyad.sultan41@example.com', '+97336044440', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-042', 'Asma', 'Merchant', 'asma.merchant42@example.com', '+97336045551', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-043', 'Ibrahim', 'Darwish', 'ibrahim.darwish43@example.com', '+97336046662', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-044', 'Noura', 'Qamber', 'noura.qamber44@example.com', '+97336047773', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-045', 'Talal', 'Ghuloom', 'talal.ghuloom45@example.com', '+97336048884', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-046', 'Ghada', 'Behzad', 'ghada.behzad46@example.com', '+97336049995', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-047', 'Rashid', 'Rahimi', 'rashid.rahimi47@example.com', '+97336051106', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-048', 'Deena', 'Al-Zaki', 'deena.alzaki48@example.com', '+97336052217', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-049', 'Kareem', 'Al-Saffar', 'kareem.alsaffar49@example.com', '+97336053328', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)
VALUES ('cust-050', 'Yasmin', 'Kameshki', 'yasmin.kameshki50@example.com', '+97336054439', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-001', 'cust-001', 'shipping', 'Corporate Office', 'Building 204, Road 3812', 'Floor 3, Creative Wing', 'Manama', 'Capital', '318', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-002', 'cust-002', 'shipping', 'Production Studio', 'Tower B, Suite 501, Road 2819', '', 'Seef District', 'Capital', '428', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-003', 'cust-003', 'shipping', 'Corporate Office', 'Al Raya Tower, Flat 12, Road 2408', '', 'Juffair', 'Capital', '324', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-004', 'cust-004', 'shipping', 'Production Studio', 'Villa 42, Avenue 15', 'Floor 3, Creative Wing', 'Saar', 'Northern', '525', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-005', 'cust-005', 'shipping', 'Corporate Office', 'Lagoon Villa 18, Floating City Walk', '', 'Amwaj Islands', 'Muharraq', '257', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-006', 'cust-006', 'shipping', 'Production Studio', 'Building 88, Bukuwara Road 12', '', 'Riffa', 'Southern', '911', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-007', 'cust-007', 'shipping', 'Corporate Office', 'Office 203, DCC Complex 4', 'Floor 3, Creative Wing', 'Sanabis', 'Capital', '410', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-008', 'cust-008', 'shipping', 'Production Studio', 'Villa 310, Budaiya Main Highway', '', 'Budaiya', 'Northern', '550', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-009', 'cust-009', 'shipping', 'Corporate Office', 'Hangar Office 4, Airport Road 22', '', 'Muharraq', 'Muharraq', '202', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-010', 'cust-010', 'shipping', 'Production Studio', 'Resort Annex 3, Zallaq Coastal Way', 'Floor 3, Creative Wing', 'Zallaq', 'Southern', '1052', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-011', 'cust-011', 'shipping', 'Corporate Office', 'Building 204, Road 3812', '', 'Manama', 'Capital', '318', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-012', 'cust-012', 'shipping', 'Production Studio', 'Tower B, Suite 501, Road 2819', '', 'Seef District', 'Capital', '428', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-013', 'cust-013', 'shipping', 'Corporate Office', 'Al Raya Tower, Flat 12, Road 2408', 'Floor 3, Creative Wing', 'Juffair', 'Capital', '324', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-014', 'cust-014', 'shipping', 'Production Studio', 'Villa 42, Avenue 15', '', 'Saar', 'Northern', '525', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-015', 'cust-015', 'shipping', 'Corporate Office', 'Lagoon Villa 18, Floating City Walk', '', 'Amwaj Islands', 'Muharraq', '257', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-016', 'cust-016', 'shipping', 'Production Studio', 'Building 88, Bukuwara Road 12', 'Floor 3, Creative Wing', 'Riffa', 'Southern', '911', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-017', 'cust-017', 'shipping', 'Corporate Office', 'Office 203, DCC Complex 4', '', 'Sanabis', 'Capital', '410', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-018', 'cust-018', 'shipping', 'Production Studio', 'Villa 310, Budaiya Main Highway', '', 'Budaiya', 'Northern', '550', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-019', 'cust-019', 'shipping', 'Corporate Office', 'Hangar Office 4, Airport Road 22', 'Floor 3, Creative Wing', 'Muharraq', 'Muharraq', '202', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-020', 'cust-020', 'shipping', 'Production Studio', 'Resort Annex 3, Zallaq Coastal Way', '', 'Zallaq', 'Southern', '1052', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-021', 'cust-021', 'shipping', 'Corporate Office', 'Building 204, Road 3812', '', 'Manama', 'Capital', '318', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-022', 'cust-022', 'shipping', 'Production Studio', 'Tower B, Suite 501, Road 2819', 'Floor 3, Creative Wing', 'Seef District', 'Capital', '428', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-023', 'cust-023', 'shipping', 'Corporate Office', 'Al Raya Tower, Flat 12, Road 2408', '', 'Juffair', 'Capital', '324', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-024', 'cust-024', 'shipping', 'Production Studio', 'Villa 42, Avenue 15', '', 'Saar', 'Northern', '525', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-025', 'cust-025', 'shipping', 'Corporate Office', 'Lagoon Villa 18, Floating City Walk', 'Floor 3, Creative Wing', 'Amwaj Islands', 'Muharraq', '257', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-026', 'cust-026', 'shipping', 'Production Studio', 'Building 88, Bukuwara Road 12', '', 'Riffa', 'Southern', '911', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-027', 'cust-027', 'shipping', 'Corporate Office', 'Office 203, DCC Complex 4', '', 'Sanabis', 'Capital', '410', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-028', 'cust-028', 'shipping', 'Production Studio', 'Villa 310, Budaiya Main Highway', 'Floor 3, Creative Wing', 'Budaiya', 'Northern', '550', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-029', 'cust-029', 'shipping', 'Corporate Office', 'Hangar Office 4, Airport Road 22', '', 'Muharraq', 'Muharraq', '202', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-030', 'cust-030', 'shipping', 'Production Studio', 'Resort Annex 3, Zallaq Coastal Way', '', 'Zallaq', 'Southern', '1052', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-031', 'cust-031', 'shipping', 'Corporate Office', 'Building 204, Road 3812', 'Floor 3, Creative Wing', 'Manama', 'Capital', '318', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-032', 'cust-032', 'shipping', 'Production Studio', 'Tower B, Suite 501, Road 2819', '', 'Seef District', 'Capital', '428', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-033', 'cust-033', 'shipping', 'Corporate Office', 'Al Raya Tower, Flat 12, Road 2408', '', 'Juffair', 'Capital', '324', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-034', 'cust-034', 'shipping', 'Production Studio', 'Villa 42, Avenue 15', 'Floor 3, Creative Wing', 'Saar', 'Northern', '525', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-035', 'cust-035', 'shipping', 'Corporate Office', 'Lagoon Villa 18, Floating City Walk', '', 'Amwaj Islands', 'Muharraq', '257', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-036', 'cust-036', 'shipping', 'Production Studio', 'Building 88, Bukuwara Road 12', '', 'Riffa', 'Southern', '911', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-037', 'cust-037', 'shipping', 'Corporate Office', 'Office 203, DCC Complex 4', 'Floor 3, Creative Wing', 'Sanabis', 'Capital', '410', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-038', 'cust-038', 'shipping', 'Production Studio', 'Villa 310, Budaiya Main Highway', '', 'Budaiya', 'Northern', '550', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-039', 'cust-039', 'shipping', 'Corporate Office', 'Hangar Office 4, Airport Road 22', '', 'Muharraq', 'Muharraq', '202', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-040', 'cust-040', 'shipping', 'Production Studio', 'Resort Annex 3, Zallaq Coastal Way', 'Floor 3, Creative Wing', 'Zallaq', 'Southern', '1052', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-041', 'cust-041', 'shipping', 'Corporate Office', 'Building 204, Road 3812', '', 'Manama', 'Capital', '318', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-042', 'cust-042', 'shipping', 'Production Studio', 'Tower B, Suite 501, Road 2819', '', 'Seef District', 'Capital', '428', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-043', 'cust-043', 'shipping', 'Corporate Office', 'Al Raya Tower, Flat 12, Road 2408', 'Floor 3, Creative Wing', 'Juffair', 'Capital', '324', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-044', 'cust-044', 'shipping', 'Production Studio', 'Villa 42, Avenue 15', '', 'Saar', 'Northern', '525', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-045', 'cust-045', 'shipping', 'Corporate Office', 'Lagoon Villa 18, Floating City Walk', '', 'Amwaj Islands', 'Muharraq', '257', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-046', 'cust-046', 'shipping', 'Production Studio', 'Building 88, Bukuwara Road 12', 'Floor 3, Creative Wing', 'Riffa', 'Southern', '911', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-047', 'cust-047', 'shipping', 'Corporate Office', 'Office 203, DCC Complex 4', '', 'Sanabis', 'Capital', '410', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-048', 'cust-048', 'shipping', 'Production Studio', 'Villa 310, Budaiya Main Highway', '', 'Budaiya', 'Northern', '550', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-049', 'cust-049', 'shipping', 'Corporate Office', 'Hangar Office 4, Airport Road 22', 'Floor 3, Creative Wing', 'Muharraq', 'Muharraq', '202', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)
VALUES ('addr-cust-050', 'cust-050', 'shipping', 'Production Studio', 'Resort Annex 3, Zallaq Coastal Way', '', 'Zallaq', 'Southern', '1052', 'BH', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.coupon (id, code, discount_type, discount_value, min_order_amount, is_active, starts_at, expires_at, created_at) VALUES
  ('cpn-001', 'RAMADAN2026', 'percentage', 15.000, 1000.000, true, now() - interval '20 days', now() + interval '60 days', now()),
  ('cpn-002', 'NEWGEAR100', 'fixed', 100.000, 1500.000, true, now() - interval '10 days', now() + interval '90 days', now()),
  ('cpn-003', 'F1SPECIAL', 'percentage', 20.000, 3000.000, true, now() - interval '5 days', now() + interval '45 days', now()),
  ('cpn-004', 'PRODUCERVIP', 'fixed', 250.000, 5000.000, true, now() - interval '1 day', now() + interval '120 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.vehicle (id, plate, name, kind, notes, is_active, created_at, updated_at) VALUES
  ('veh-01', '521990', 'Mercedes-Benz Sprinter 519 Camera Truck', 'van', 'Heavy camera package and lighting transport', true, now(), now()),
  ('veh-02', '412033', 'Ford Transit Mobile Production Office', 'van', 'DIT on-set color grading workstation inside', true, now(), now()),
  ('veh-03', '631899', 'Isuzu NPR 4.5-Ton Heavy Grip Truck', 'truck', 'C-stands, track, dollies and generator power', true, now(), now()),
  ('veh-04', '719022', 'Toyota HiAce Crew Shuttle Van', 'van', 'Production crew transport (14 seats)', true, now(), now()),
  ('veh-05', '881023', 'Toyota Land Cruiser 300 GR-Sport Scouting Unit', 'car', 'Desert and rugged terrain scouting vehicle', true, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.delivery_zone (id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES
  ('dz-01', 'Capital Governorate (Manama & Seef)', 'محافظة العاصمة (المنامة والسيف)', '{"Manama", "Seef", "Juffair", "Sanabis"}', 5.000, 20.000, 100.000, true, 1, now(), now()),
  ('dz-02', 'Northern Governorate (Saar & Budaiya)', 'المحافظة الشمالية (سار والبديع)', '{"Saar", "Budaiya", "Janabiya", "Jasra"}', 7.000, 20.000, 150.000, true, 2, now(), now()),
  ('dz-03', 'Southern Governorate (Zallaq & Sakhir)', 'المحافظة الجنوبية (الزلاق والصخير)', '{"Zallaq", "Sakhir", "Riffa", "Durrat Al Bahrain"}', 10.000, 30.000, 200.000, true, 3, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO delivery.delivery_slot (id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at) VALUES
  ('ds-01', 'dz-01', 1, '09:00', '13:00', 8, true, now()),
  ('ds-02', 'dz-01', 1, '14:00', '18:00', 8, true, now()),
  ('ds-03', 'dz-02', 2, '10:00', '15:00', 6, true, now()),
  ('ds-04', 'dz-03', 3, '09:00', '14:00', 6, true, now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. WORKFLOW SERVICE (Tasks, Calendar Events, Letter Templates)
-- ----------------------------------------------------------------------------
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-01', 'Complete Soundstage Light Grid Rigging for STC 5G TVC', 'Complete Soundstage Light Grid Rigging for STC 5G TVC', '519c98db-889e-4b93-ba19-0015bde5a465', (CURRENT_DATE + INTERVAL '-25 days')::date, 'urgent', 'done', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-02', 'Finalize DCI 4K Color Grading Pass for Falcon Airways Master', 'Finalize DCI 4K Color Grading Pass for Falcon Airways Master', '71190c9f-71eb-41a5-8636-7f2ad6960be8', (CURRENT_DATE + INTERVAL '-18 days')::date, 'high', 'done', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-03', 'Apply for Coastal Airspace Drone Permits with Civil Aviation', 'Apply for Coastal Airspace Drone Permits with Civil Aviation', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', (CURRENT_DATE + INTERVAL '-12 days')::date, 'high', 'done', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-04', 'Clean, Collimator-Test & Pack Cooke Anamorphic Prime Set', 'Clean, Collimator-Test & Pack Cooke Anamorphic Prime Set', '67a177f9-65e6-4e40-b0a9-f1168e276326', (CURRENT_DATE + INTERVAL '-8 days')::date, 'normal', 'done', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-05', 'Audit External Drive Archives and Run Checksums for EWB Footage', 'Audit External Drive Archives and Run Checksums for EWB Footage', '3b06b26b-5eb5-4395-837e-4e24d0a148de', (CURRENT_DATE + INTERVAL '-4 days')::date, 'normal', 'done', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-06', 'Deliver Final 8K Master ProRes 4444 XQ to Batelco Brand Team', 'Deliver Final 8K Master ProRes 4444 XQ to Batelco Brand Team', '71190c9f-71eb-41a5-8636-7f2ad6960be8', (CURRENT_DATE + INTERVAL '2 days')::date, 'urgent', 'in_progress', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-07', 'Prepare Location Scouting Repertoire for Gulf Coast Luxury Resort', 'Prepare Location Scouting Repertoire for Gulf Coast Luxury Resort', '519c98db-889e-4b93-ba19-0015bde5a465', (CURRENT_DATE + INTERVAL '4 days')::date, 'high', 'in_progress', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-08', 'Calibrate Sony BVM-HX310 Reference Monitors with SpectraCal Colorimeter', 'Calibrate Sony BVM-HX310 Reference Monitors with SpectraCal Colorimeter', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', (CURRENT_DATE + INTERVAL '5 days')::date, 'high', 'in_progress', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-09', 'Review Q4 Equipment Insurance & Fleet Registration Renewals', 'Review Q4 Equipment Insurance & Fleet Registration Renewals', '04c696d7-f5e1-408c-8723-205b567d6119', (CURRENT_DATE + INTERVAL '7 days')::date, 'normal', 'todo', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-10', 'Draft Commercial Production Scope for Bapco Energy Park Project', 'Draft Commercial Production Scope for Bapco Energy Park Project', '519c98db-889e-4b93-ba19-0015bde5a465', (CURRENT_DATE + INTERVAL '9 days')::date, 'high', 'todo', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-11', 'Coordinate Extras Casting & Call Sheets for Toyota Offroad Shoot', 'Coordinate Extras Casting & Call Sheets for Toyota Offroad Shoot', '67a177f9-65e6-4e40-b0a9-f1168e276326', (CURRENT_DATE + INTERVAL '11 days')::date, 'normal', 'todo', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-12', 'Schedule Soundstage Cyclorama Fresh White Paint Job', 'Schedule Soundstage Cyclorama Fresh White Paint Job', '3b06b26b-5eb5-4395-837e-4e24d0a148de', (CURRENT_DATE + INTERVAL '14 days')::date, 'low', 'todo', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-13', 'Ingest and Create DaVinci Proxies for F1 Circuit Shoot', 'Ingest and Create DaVinci Proxies for F1 Circuit Shoot', '71190c9f-71eb-41a5-8636-7f2ad6960be8', (CURRENT_DATE + INTERVAL '15 days')::date, 'normal', 'todo', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-14', 'Update Web Portfolio Showcase with Recent Bahrain Bay Drone Shots', 'Update Web Portfolio Showcase with Recent Bahrain Bay Drone Shots', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', (CURRENT_DATE + INTERVAL '18 days')::date, 'low', 'todo', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('tsk-15', 'Organize Monthly Grip Department Inventory and Rigging Inspection', 'Organize Monthly Grip Department Inventory and Rigging Inspection', '67a177f9-65e6-4e40-b0a9-f1168e276326', (CURRENT_DATE + INTERVAL '20 days')::date, 'normal', 'todo', 'production', 'proj-main', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('evt-01', 'STC 5G TVC Principal Photography (Day 1)', 'Soundstage A filming with ARRI Alexa 35 & Cooke lenses', (CURRENT_DATE - INTERVAL '10 days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '10 days' + TIME '09:00:00' + INTERVAL '10 hours')::timestamptz, '519c98db-889e-4b93-ba19-0015bde5a465', 'production', 'iShoot Soundstage A, Manama', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('evt-02', 'STC 5G TVC Principal Photography (Day 2)', 'Exterior location filming at Bahrain Bay Promenade', (CURRENT_DATE - INTERVAL '9 days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '9 days' + TIME '09:00:00' + INTERVAL '8 hours')::timestamptz, '519c98db-889e-4b93-ba19-0015bde5a465', 'production', 'Bahrain Bay Coastal Walk', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('evt-03', 'Falcon Airways Executive Screenings & Approval', 'Screening of final 4K in-flight master in screening suite', (CURRENT_DATE - INTERVAL '5 days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '5 days' + TIME '09:00:00' + INTERVAL '3 hours')::timestamptz, '04c696d7-f5e1-408c-8723-205b567d6119', 'production', 'Cinema Grading Theater, Seef', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('evt-04', 'Bapco Sustainability Film Pre-Production Meeting', 'Director, DP and creative producer alignment session', (CURRENT_DATE - INTERVAL '2 days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '2 days' + TIME '09:00:00' + INTERVAL '2 hours')::timestamptz, '519c98db-889e-4b93-ba19-0015bde5a465', 'production', 'Conference Suite 1', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('evt-05', 'Toyota Land Cruiser Desert Location Scouting', 'Scouting Sakhir and Zallaq dunes with client agency reps', (CURRENT_DATE - INTERVAL '-1 days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '-1 days' + TIME '09:00:00' + INTERVAL '5 hours')::timestamptz, '519c98db-889e-4b93-ba19-0015bde5a465', 'production', 'Sakhir Desert Area', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('evt-06', 'Quarterly Board Operations & Financial Review', 'Q3 financial performance and 2027 gear cap-ex planning', (CURRENT_DATE - INTERVAL '-3 days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '-3 days' + TIME '09:00:00' + INTERVAL '3 hours')::timestamptz, '04c696d7-f5e1-408c-8723-205b567d6119', 'production', 'Executive Boardroom', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('evt-07', 'Exhibition World Bahrain Tech Summit Filming', 'Live event coverage with 4-camera wireless optical fiber rig', (CURRENT_DATE - INTERVAL '-6 days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '-6 days' + TIME '09:00:00' + INTERVAL '8 hours')::timestamptz, '519c98db-889e-4b93-ba19-0015bde5a465', 'production', 'EWB Main Hall 1', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('evt-08', 'Color Grading Masterclass & Staff Training', 'HDR workflow and ACES 1.3 color transform training', (CURRENT_DATE - INTERVAL '-10 days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '-10 days' + TIME '09:00:00' + INTERVAL '4 hours')::timestamptz, '71190c9f-71eb-41a5-8636-7f2ad6960be8', 'production', 'Grading Suite B', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.letter_template (id, name_en, name_ar, template_body, sort_order) VALUES
  ('lt-01', 'Employment & Salary Certificate', 'شهادة راتب وعمل', 'This is to certify that {{employee_name}} is employed at {{company_name}} with monthly salary {{salary}}.', 1),
  ('lt-02', 'Quotation Official Cover Letter', 'خطاب تقديم عرض أسعار', 'We are pleased to submit our commercial quotation {{quotation_number}} for your review.', 2),
  ('lt-03', 'Equipment Vault Release Handover Form', 'إقرار استلام وتسليم معدات تصوير', 'The undersigned acknowledges receipt of camera packages listed in voucher {{voucher_number}} in pristine condition.', 3)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. CMS SERVICE (Pages, Articles, FAQs, Statistics, Reviews, Snapshot)
-- ----------------------------------------------------------------------------
INSERT INTO cms.page (id, slug, page_type, title_en, title_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at)
VALUES ('6fb633a9-ce4b-4666-9077-60771c345ebf', 'about', 'about', 'Northwind — About', 'عن Northwind', '[{"type":"hero","titleAr":"نصنع القصة","titleEn":"Made for the Story"}]'::jsonb, true, true, false, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.page (id, slug, page_type, title_en, title_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at)
VALUES ('0cd14799-2d10-4740-90a3-8161c068839e', 'portfolio', 'works', 'Featured Productions & Showcases', 'أبرز الأعمال والإنتاجات', '[{"type":"portfolio","titleAr":"أعمالنا","titleEn":"Our Work"}]'::jsonb, true, true, false, 2, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.page (id, slug, page_type, title_en, title_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at)
VALUES ('37ade01e-bb1e-4b1b-bc3c-3b11f260410a', 'equipment-rental', 'services', 'Cinema Gear & Studio Soundstage Vault', 'تأجير المعدات السينمائية والاستوديو', '[{"type":"services","titleAr":"خزينة المعدات","titleEn":"Equipment Vault"}]'::jsonb, true, true, false, 3, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)
VALUES ('b45b8577-6564-4ee3-b02f-03e94b127428', 'story-1', 'Behind the Scenes: Gulfwave 5G Anamorphic Campaign', 'خلف الكواليس: حملة ألترا 5G الأنامورفية', 'Behind-the-scenes look at filming with ARRI Alexa 35 and Cooke Anamorphic lenses at Bahrain Bay.', 'نظرة على كواليس التصوير بكاميرات آري وعدسات أنامورفيك في خليج البحرين.', 'case-study', '{"production","cinema","tech"}', 'iShoot Editorial Team', 'published', true, now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)
VALUES ('87df8568-e6b5-4306-a11a-013eff76d29e', 'story-2', 'Documenting Bahrain''s Heritage in 8K RAW', 'توثيق تراث البحرين بدقة 8K RAW', 'Behind the 8K RAW aerial and ground production for Exhibition World Bahrain.', 'كيف تم إنتاج الفيلم التوثيقي لمركز المعارض بدقة 8K RAW.', 'technology', '{"production","cinema","tech"}', 'iShoot Editorial Team', 'published', false, now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)
VALUES ('86279b56-65df-427d-966a-da7806da2515', 'story-3', 'Mastering HDR Color Grading in DaVinci Resolve Studio', 'إتقان التلوين السينمائي HDR في دافينشي ريزولف', 'Technical breakdown of our post-production color pipeline.', 'تفاصيل استراتيجية التلوين السينمائي الرقمي لإصدارات HDR.', 'case-study', '{"production","cinema","tech"}', 'iShoot Editorial Team', 'published', false, now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)
VALUES ('459c1380-0b64-4048-a6ef-29db82b3318b', 'story-4', 'Next-Gen Aerial Drone Cinematography Workflows', 'تقنيات التصوير الجوي السينمائي بالدرون', 'How heavy-lifter drones and 8K sensors transform commercial filming.', 'كيف تسهم طائرات الدرون مع مستشعرات 8K في الارتقاء بالإعلانات التجارية.', 'technology', '{"production","cinema","tech"}', 'iShoot Editorial Team', 'published', false, now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)
VALUES ('8a98790e-fa2c-445f-8511-2e56b11cea59', 'What media production services do you offer?', 'ما هي خدمات الإنتاج الإعلامي التي تقدمونها؟', 'We offer full-service commercial production, brand films, aerial drone cinematography, studio soundstage rental, and DaVinci Resolve HDR color grading.', 'نقدم خدمات الإنتاج الإعلاني والسينمائي المتكامل، التصوير الجوي بالدرون، تأجير الاستوديو، والتلوين السينمائي HDR.', 'general', true, 1, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)
VALUES ('1f403687-9f20-4139-95c4-c5b4ddf4e062', 'What cinema camera packages are available for rental?', 'ما هي حزم الكاميرات السينمائية المتاحة للتأجير؟', 'Our equipment vault features ARRI Alexa 35, RED V-Raptor XL 8K, Cooke Anamorphic prime lenses, and Astera Titan tube packages.', 'تتضمن خزينة معداتنا كاميرات آري أليكسا 35، ريد رابتور 8K، عدسات كوك أنامورفيك، وأطقم إضاءة أستيرا.', 'general', true, 2, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)
VALUES ('9c47ba29-ad63-4858-8f26-85723cb99611', 'How do you manage filming permits and government clearances?', 'كيف تنظمون تصاريح التصوير والتراخيص الحكومية؟', 'We manage all location permits, airspace approvals for drone operations, and filming clearances with the Ministry of Information Affairs.', 'نتولى كافة تصاريح الموقع وتراخيص الطيران الجوي للدرون وموافقات وزارة الإعلام.', 'general', true, 3, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)
VALUES ('1f3f5d4d-9ea2-4898-8980-c245f54809bc', 'What are your standard payment and invoicing terms?', 'ما هي شروط الدفع والفوترة المعتمدة؟', 'Standard terms are 50% deposit upon contract signing and 50% upon final master export delivery, with net-30 terms for corporate accounts.', 'تتضمن الشروط الدفع 50% عند التوقيع و50% عند التسليم النهائي، مع فترة سداد 30 يوماً للشركات.', 'general', true, 4, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)
VALUES ('4fb730e6-4ea1-41a3-8a54-afae5632eb7e', 'What media production services do you offer?', 'ما هي خدمات الإنتاج الإعلامي التي تقدمونها؟', 'We offer full-service commercial production, brand films, aerial drone cinematography, studio soundstage rental, and DaVinci Resolve HDR color grading.', 'نقدم خدمات الإنتاج الإعلاني والسينمائي المتكامل، التصوير الجوي بالدرون، تأجير الاستوديو، والتلوين السينمائي HDR.', 'general', true, 1, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)
VALUES ('6b3b788e-3e0a-468a-8c3e-074574e85cf2', 'What cinema camera packages are available for rental?', 'ما هي حزم الكاميرات السينمائية المتاحة للتأجير؟', 'Our equipment vault features ARRI Alexa 35, RED V-Raptor XL 8K, Cooke Anamorphic prime lenses, and Astera Titan tube packages.', 'تتضمن خزينة معداتنا كاميرات آري أليكسا 35، ريد رابتور 8K، عدسات كوك أنامورفيك، وأطقم إضاءة أستيرا.', 'general', true, 2, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)
VALUES ('ff537fbb-f158-4761-a443-62ec58f1bf63', 'How do you manage filming permits and government clearances?', 'كيف تنظمون تصاريح التصوير والتراخيص الحكومية؟', 'We manage all location permits, airspace approvals for drone operations, and filming clearances with the Ministry of Information Affairs.', 'نتولى كافة تصاريح الموقع وتراخيص الطيران الجوي للدرون وموافقات وزارة الإعلام.', 'general', true, 3, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)
VALUES ('1f7b5318-7c34-4a1b-8b39-d858f0b97f22', 'What are your standard payment and invoicing terms?', 'ما هي شروط الدفع والفوترة المعتمدة؟', 'Standard terms are 50% deposit upon contract signing and 50% upon final master export delivery, with net-30 terms for corporate accounts.', 'تتضمن الشروط الدفع 50% عند التوقيع و50% عند التسليم النهائي، مع فترة سداد 30 يوماً للشركات.', 'general', true, 4, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.statistic (id, metric_value, label_en, label_ar, sort_order)
VALUES ('years-exp', '12+', 'Years of Experience', 'سنوات من الخبرة', 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.statistic (id, metric_value, label_en, label_ar, sort_order)
VALUES ('completed-films', '450+', 'Productions Delivered', 'إنتاجات منجزة', 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.statistic (id, metric_value, label_en, label_ar, sort_order)
VALUES ('happy-clients', '180+', 'Corporate & Brand Clients', 'عملاء وشركات', 3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.statistic (id, metric_value, label_en, label_ar, sort_order)
VALUES ('gear-value', '100%', 'In-House Gear & Studio', 'معدات واستوديو مملوك بالكامل', 4)
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)
VALUES ('756e609c-e08f-47f8-8889-286fbf2e9c40', 'Hamad Al-Romaihi', 'حمد الرميحي', 'Gulfwave Telecom', 'الاتصالات الخليجية', 'Exceptional quality and professional execution throughout the production. The Alexa 35 visuals were stunning.', 'جودة استثنائية وتنفيذ احترافي في جميع مراحل الإنتاج. صورة أليكسا 35 كانت مذهلة.', 5, true, '2026', 1, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)
VALUES ('ef812075-8749-4504-834b-ec7b923fb67d', 'Tariq Al-Doseri', 'طارق الدوسري', 'Exhibition World Bahrain', 'مركز البحرين العالمي للمعارض', 'Delivered our brand story with world-class cinematic polish and flawless 8K aerial drone shots.', 'قدموا قصة علامتنا بنمط سينمائي عالمي ولقطات جوية 8K مبهرة.', 5, true, '2026', 2, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)
VALUES ('c3442d6a-a2ff-432c-8b75-ab77b14c23c2', 'Mona Al-Khatib', 'منى الخطيب', 'Falcon Airways', 'طيران الفالكون', 'Outstanding crew and seamless post-production color grading. High standards from start to finish.', 'فريق عمل رائع وتلوين سينمائي مميز. معايير عالية من البداية حتى النهاية.', 5, true, '2026', 3, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)
VALUES ('eaffa9a5-17a8-4370-b350-05dddeb5e2e0', 'Sami Saleh', 'سامي صالح', 'Harbor National Bank', 'بنك المرفأ الوطني', 'The most reliable cinema unit in the region. Always delivering ahead of schedule.', 'وحدة الإنتاج السينمائي الأكثر موثوقية بالمنطقة. التزام دائم بالمواعيد.', 5, true, '2026', 4, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)
VALUES ('9473567b-fa3b-49d7-815c-1c76e1254fa0', 'Hamad Al-Romaihi', 'حمد الرميحي', 'Gulfwave Telecom', 'الاتصالات الخليجية', 'Exceptional quality and professional execution throughout the production. The Alexa 35 visuals were stunning.', 'جودة استثنائية وتنفيذ احترافي في جميع مراحل الإنتاج. صورة أليكسا 35 كانت مذهلة.', 5, true, '2026', 1, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)
VALUES ('4cc1f5a3-13eb-433a-bc9c-466c02b51051', 'Tariq Al-Doseri', 'طارق الدوسري', 'Exhibition World Bahrain', 'مركز البحرين العالمي للمعارض', 'Delivered our brand story with world-class cinematic polish and flawless 8K aerial drone shots.', 'قدموا قصة علامتنا بنمط سينمائي عالمي ولقطات جوية 8K مبهرة.', 5, true, '2026', 2, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)
VALUES ('3e8f296c-5956-4c19-b303-9f2a4f535266', 'Mona Al-Khatib', 'منى الخطيب', 'Falcon Airways', 'طيران الفالكون', 'Outstanding crew and seamless post-production color grading. High standards from start to finish.', 'فريق عمل رائع وتلوين سينمائي مميز. معايير عالية من البداية حتى النهاية.', 5, true, '2026', 3, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)
VALUES ('040f9510-7c47-4aea-b1c5-f6e29351fe14', 'Sami Saleh', 'سامي صالح', 'Harbor National Bank', 'بنك المرفأ الوطني', 'The most reliable cinema unit in the region. Always delivering ahead of schedule.', 'وحدة الإنتاج السينمائي الأكثر موثوقية بالمنطقة. التزام دائم بالمواعيد.', 5, true, '2026', 4, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.content_snapshot (id, draft, published, revision, published_at, updated_at)
VALUES ('main', '{"faqs":[{"id":"example-faq-0","answerAr":"استخدم صفحة التواصل أو اتصل بنا أو أرسل رسالة واتساب؛ نرد خلال يوم عمل.","answerEn":"Use the contact page, call us or send a WhatsApp message; we reply within a working day.","category":"general","isSample":true,"createdAt":"2026-11-07T18:44:52.391Z","sortOrder":0,"questionAr":"كيف أتواصل معكم؟","questionEn":"How do I get in touch?","isPublished":true},{"id":"example-faq-1","answerAr":"عنواننا وساعات العمل في صفحة التواصل.","answerEn":"Our address and opening hours are on the contact page.","category":"general","isSample":true,"createdAt":"2026-11-07T18:44:52.391Z","sortOrder":1,"questionAr":"أين موقعكم؟","questionEn":"Where are you located?","isPublished":true},{"id":"example-faq-2","answerAr":"بالبطاقة أو التحويل البنكي أو نقدًا؛ نؤكد الخيارات مع طلبك.","answerEn":"By card, bank transfer or cash; we confirm the options with your order.","category":"general","isSample":true,"createdAt":"2026-11-07T18:44:52.391Z","sortOrder":2,"questionAr":"كيف أدفع؟","questionEn":"How can I pay?","isPublished":true}],"pages":[{"id":"example-page-0","slug":"","blocks":[{"id":"22774b7c","data":{"style":"inherit","title":{"ar":"","en":""},"subtitle":{"ar":"","en":""}},"type":"hero","visible":true},{"id":"1fe50d4a","data":{"title":{"ar":"","en":""}},"type":"about","visible":true},{"id":"8dd0f006","data":{"title":{"ar":"","en":""}},"type":"clients","visible":true},{"id":"b3876217","data":{"title":{"ar":"","en":""}},"type":"services","visible":true},{"id":"5307e85f","data":{"limit":12,"title":{"ar":"","en":""},"layout":"grid","category":"","filterable":true,"presentation":"inherit"},"type":"catalogue","visible":true},{"id":"ef746b0a","data":{"title":{"ar":"","en":""}},"type":"stats","visible":true},{"id":"fa437272","data":{"title":{"ar":"","en":""}},"type":"testimonials","visible":true},{"id":"1a76a9b5","data":{"title":{"ar":"","en":""}},"type":"faq","visible":true}],"title_ar":"الرئيسية","title_en":"Home","in_footer":false,"in_header":false,"page_type":"home","is_visible":true,"sort_order":0,"updated_at":"2026-11-07T18:44:52.390Z","seo_title_ar":"","seo_title_en":"","seo_description_ar":"","seo_description_en":""},{"id":"example-page-1","slug":"about","blocks":[{"id":"fa25b468","data":{"title":{"ar":"","en":""}},"type":"leader","visible":true},{"id":"5916894a","data":{"title":{"ar":"","en":""}},"type":"pillars","visible":true},{"id":"fc8b5f93","data":{"title":{"ar":"","en":""}},"type":"stats","visible":true},{"id":"872e651f","data":{"title":{"ar":"","en":""}},"type":"equipment","visible":true}],"title_ar":"من نحن","title_en":"About","in_footer":true,"in_header":true,"page_type":"about","is_visible":true,"sort_order":1,"updated_at":"2026-11-07T18:44:52.390Z","seo_title_ar":"","seo_title_en":"","seo_description_ar":"","seo_description_en":""},{"id":"example-page-2","slug":"contact","blocks":[{"id":"3b61eb50","data":{"title":{"ar":"","en":""}},"type":"contact_form","visible":true}],"title_ar":"اتصل بنا","title_en":"Contact","in_footer":true,"in_header":true,"page_type":"contact","is_visible":true,"sort_order":2,"updated_at":"2026-11-07T18:44:52.390Z","seo_title_ar":"","seo_title_en":"","seo_description_ar":"","seo_description_en":""}],"stats":[{"id":"example-stat-0","icon":null,"value":"10+","preset":null,"source":"manual","suffix":null,"labelAr":"سنوات من الخبرة","labelEn":"Years of experience","roundTo":null,"isSample":true,"sortOrder":0,"subLabelAr":null,"subLabelEn":null,"presetParam":null,"storedValue":"10+"},{"id":"example-stat-1","icon":null,"value":"300+","preset":null,"source":"manual","suffix":null,"labelAr":"مشروع منجز","labelEn":"Projects delivered","roundTo":null,"isSample":true,"sortOrder":1,"subLabelAr":null,"subLabelEn":null,"presetParam":null,"storedValue":"300+"},{"id":"example-stat-2","icon":null,"value":"500+","preset":null,"source":"manual","suffix":null,"labelAr":"عميل سعيد","labelEn":"Happy clients","roundTo":null,"isSample":true,"sortOrder":2,"subLabelAr":null,"subLabelEn":null,"presetParam":null,"storedValue":"500+"}],"config":{"seo":{"titleAr":"","titleEn":"","descriptionAr":"","descriptionEn":""},"pages":[{"id":"works","visible":true},{"id":"about","visible":true},{"id":"contact","visible":true}],"design":{"tones":{"home":"inherit","about":"inherit","store":"inherit","custom":"inherit","footer":"inherit","header":"inherit","account":"inherit","contact":"inherit","articles":"inherit","collection":"inherit"},"motion":"full","density":"comfortable","version":1,"mixedBase":"light","heroHeight":"comfortable","defaultMode":"dark","allowedModes":["light","dark","mixed"],"contentWidth":"wide","followSystem":false,"footerLayout":"standard","headerLayout":"standard","motionScheme":"expressive","visitorSwitching":false,"heroOverlayOpacity":45,"bannerIntervalSeconds":8},"hoursAr":"","hoursEn":"","inquiry":{"budget":true,"location":true,"timeline":true,"reference":true},"purpose":"media","articles":{"slug":"news","navAr":"الأخبار","navEn":"News"},"commerce":{"search":true,"sorting":true,"version":1,"branches":[],"pageSize":12,"categories":true,"facetLabels":[],"orderLayout":"split","capabilities":{"shop":true,"pickup":true,"accounts":true,"delivery":true,"ordering":true,"wishlist":true,"downloads":true,"inquiries":true},"relatedItems":true,"categoryParents":{},"orderAttachments":true,"collectCoordinates":false,"inquiryAttachments":true,"branchSelectionRequired":false},"sections":[{"id":"about","visible":true},{"id":"clients","visible":true},{"id":"services","visible":true},{"id":"portfolio","visible":true},{"id":"stats","visible":true},{"id":"reviews","visible":true},{"id":"faq","visible":true},{"id":"cta","visible":false}],"heroStyle":"cinematic","collection":{"slug":"works","navAr":"أعمالنا","navEn":"Catalogue","layout":"media","titleAr":"أعمالنا","titleEn":"Our work","subtitleAr":"نظرة عن قرب على ما نقدمه.","subtitleEn":"A closer look at what we do."},"responseAr":"سيراجع فريقنا رسالتك ويتواصل معك عبر بيانات الاتصال التي تقدمها.","responseEn":"Our team will review your message and contact you using the details you provide.","showEquipment":true,"contactIntroAr":"شاركنا ما يدور في ذهنك. اطرح سؤالك أو أخبر فريقنا بمتطلباتك.","contactIntroEn":"Tell us what you have in mind. Ask a question or share your requirements with our team.","contactTitleAr":"كل حوار بداية لشيء جديد.","contactTitleEn":"Every conversation starts something.","whatsappButton":false},"banners":[{"id":"example-banner","title_ar":"قصص تحرّك الناس","title_en":"Stories that move people","is_active":true,"media_url":"/api/samples/banner-1.svg","created_at":"2026-11-07T18:44:52.390Z","media_type":"image","subtitle_ar":"أفلام العلامات والحملات والمحتوى، من الفكرة إلى الشاشة.","subtitle_en":"Brand films, campaigns and content, from idea to screen.","display_order":0}],"clients":[],"articles":[{"id":"example-article","slug":"welcome-to-our-new-website","tags":[],"category":"news","featured":false,"title_ar":"أهلًا بكم في موقعنا الجديد","title_en":"Welcome to our new website","cover_url":"/api/samples/banner-2.svg","excerpt_ar":"اكتشف الجديد وطرق التواصل معنا.","excerpt_en":"Find out what is new and how to reach us.","publish_at":"2026-11-07T18:44:52.390Z","author_name":"","body_html_ar":"<p>سعداء بزيارتكم. يعرض هذا الموقع ما نقدمه والأعمال التي نفخر بها وطرق التواصل معنا. استبدل هذا المقال التجريبي بأخبارك.</p>","body_html_en":"<p>We are glad you are here. This website shows what we do, the work we are proud of and how to reach us. Replace this sample article with your own news.</p>","seo_title_ar":"","seo_title_en":"","seo_description_ar":"","seo_description_en":""}],"services":[{"id":"example-service-0","nameAr":"أفلام العلامات","nameEn":"Brand films","imageUrl":null,"descriptionAr":"أفلام قائمة على القصة تُظهر قيم علامتك.","descriptionEn":"Story-led films that show what your brand stands for."},{"id":"example-service-1","nameAr":"محتوى التواصل","nameEn":"Social content","imageUrl":null,"descriptionAr":"مقاطع قصيرة مصممة لكل منصة.","descriptionEn":"Short videos made for each platform."},{"id":"example-service-2","nameAr":"التصوير الفوتوغرافي","nameEn":"Photography","imageUrl":null,"descriptionAr":"تصوير المنتجات والأشخاص والأماكن.","descriptionEn":"Product, people and place photography."}],"portfolio":[{"id":"example-item-0","slug":"example-1","title_ar":"أضواء الميناء","title_en":"Harbour Lights","attributes":[],"created_at":"2026-11-07T18:44:52.390Z","client_name":"","is_featured":true,"subtitle_ar":"فيلم علامة تجارية","subtitle_en":"Brand film","aspect_ratio":"16:9","display_order":0,"thumbnail_url":"/api/samples/item-1.svg"},{"id":"example-item-1","slug":"example-2","title_ar":"سباق الصحراء","title_en":"Desert Run","attributes":[],"created_at":"2026-11-07T18:44:52.390Z","client_name":"","is_featured":false,"subtitle_ar":"حملة رياضية","subtitle_en":"Sports campaign","aspect_ratio":"16:9","display_order":1,"thumbnail_url":"/api/samples/item-2.svg"},{"id":"example-item-2","slug":"example-3","title_ar":"المدينة عند الفجر","title_en":"City at Dawn","attributes":[],"created_at":"2026-11-07T18:44:52.390Z","client_name":"","is_featured":false,"subtitle_ar":"فيلم سياحي","subtitle_en":"Tourism film","aspect_ratio":"16:9","display_order":2,"thumbnail_url":"/api/samples/item-3.svg"},{"id":"example-item-3","slug":"example-4","title_ar":"طعم البيت","title_en":"Taste of Home","attributes":[],"created_at":"2026-11-07T18:44:52.390Z","client_name":"","is_featured":false,"subtitle_ar":"سلسلة للتواصل الاجتماعي","subtitle_en":"Social series","aspect_ratio":"16:9","display_order":3,"thumbnail_url":"/api/samples/item-4.svg"}],"categories":[]}'::jsonb, '{"faqs":[{"id":"example-faq-0","answerAr":"استخدم صفحة التواصل أو اتصل بنا أو أرسل رسالة واتساب؛ نرد خلال يوم عمل.","answerEn":"Use the contact page, call us or send a WhatsApp message; we reply within a working day.","category":"general","isSample":true,"createdAt":"2026-11-07T18:44:52.391Z","sortOrder":0,"questionAr":"كيف أتواصل معكم؟","questionEn":"How do I get in touch?","isPublished":true},{"id":"example-faq-1","answerAr":"عنواننا وساعات العمل في صفحة التواصل.","answerEn":"Our address and opening hours are on the contact page.","category":"general","isSample":true,"createdAt":"2026-11-07T18:44:52.391Z","sortOrder":1,"questionAr":"أين موقعكم؟","questionEn":"Where are you located?","isPublished":true},{"id":"example-faq-2","answerAr":"بالبطاقة أو التحويل البنكي أو نقدًا؛ نؤكد الخيارات مع طلبك.","answerEn":"By card, bank transfer or cash; we confirm the options with your order.","category":"general","isSample":true,"createdAt":"2026-11-07T18:44:52.391Z","sortOrder":2,"questionAr":"كيف أدفع؟","questionEn":"How can I pay?","isPublished":true}],"pages":[{"id":"example-page-0","slug":"","blocks":[{"id":"22774b7c","data":{"style":"inherit","title":{"ar":"","en":""},"subtitle":{"ar":"","en":""}},"type":"hero","visible":true},{"id":"1fe50d4a","data":{"title":{"ar":"","en":""}},"type":"about","visible":true},{"id":"8dd0f006","data":{"title":{"ar":"","en":""}},"type":"clients","visible":true},{"id":"b3876217","data":{"title":{"ar":"","en":""}},"type":"services","visible":true},{"id":"5307e85f","data":{"limit":12,"title":{"ar":"","en":""},"layout":"grid","category":"","filterable":true,"presentation":"inherit"},"type":"catalogue","visible":true},{"id":"ef746b0a","data":{"title":{"ar":"","en":""}},"type":"stats","visible":true},{"id":"fa437272","data":{"title":{"ar":"","en":""}},"type":"testimonials","visible":true},{"id":"1a76a9b5","data":{"title":{"ar":"","en":""}},"type":"faq","visible":true}],"title_ar":"الرئيسية","title_en":"Home","in_footer":false,"in_header":false,"page_type":"home","is_visible":true,"sort_order":0,"updated_at":"2026-11-07T18:44:52.390Z","seo_title_ar":"","seo_title_en":"","seo_description_ar":"","seo_description_en":""},{"id":"example-page-1","slug":"about","blocks":[{"id":"fa25b468","data":{"title":{"ar":"","en":""}},"type":"leader","visible":true},{"id":"5916894a","data":{"title":{"ar":"","en":""}},"type":"pillars","visible":true},{"id":"fc8b5f93","data":{"title":{"ar":"","en":""}},"type":"stats","visible":true},{"id":"872e651f","data":{"title":{"ar":"","en":""}},"type":"equipment","visible":true}],"title_ar":"من نحن","title_en":"About","in_footer":true,"in_header":true,"page_type":"about","is_visible":true,"sort_order":1,"updated_at":"2026-11-07T18:44:52.390Z","seo_title_ar":"","seo_title_en":"","seo_description_ar":"","seo_description_en":""},{"id":"example-page-2","slug":"contact","blocks":[{"id":"3b61eb50","data":{"title":{"ar":"","en":""}},"type":"contact_form","visible":true}],"title_ar":"اتصل بنا","title_en":"Contact","in_footer":true,"in_header":true,"page_type":"contact","is_visible":true,"sort_order":2,"updated_at":"2026-11-07T18:44:52.390Z","seo_title_ar":"","seo_title_en":"","seo_description_ar":"","seo_description_en":""}],"stats":[{"id":"example-stat-0","icon":null,"value":"10+","preset":null,"source":"manual","suffix":null,"labelAr":"سنوات من الخبرة","labelEn":"Years of experience","roundTo":null,"isSample":true,"sortOrder":0,"subLabelAr":null,"subLabelEn":null,"presetParam":null,"storedValue":"10+"},{"id":"example-stat-1","icon":null,"value":"300+","preset":null,"source":"manual","suffix":null,"labelAr":"مشروع منجز","labelEn":"Projects delivered","roundTo":null,"isSample":true,"sortOrder":1,"subLabelAr":null,"subLabelEn":null,"presetParam":null,"storedValue":"300+"},{"id":"example-stat-2","icon":null,"value":"500+","preset":null,"source":"manual","suffix":null,"labelAr":"عميل سعيد","labelEn":"Happy clients","roundTo":null,"isSample":true,"sortOrder":2,"subLabelAr":null,"subLabelEn":null,"presetParam":null,"storedValue":"500+"}],"config":{"seo":{"titleAr":"","titleEn":"","descriptionAr":"","descriptionEn":""},"pages":[{"id":"works","visible":true},{"id":"about","visible":true},{"id":"contact","visible":true}],"design":{"tones":{"home":"inherit","about":"inherit","store":"inherit","custom":"inherit","footer":"inherit","header":"inherit","account":"inherit","contact":"inherit","articles":"inherit","collection":"inherit"},"motion":"full","density":"comfortable","version":1,"mixedBase":"light","heroHeight":"comfortable","defaultMode":"dark","allowedModes":["light","dark","mixed"],"contentWidth":"wide","followSystem":false,"footerLayout":"standard","headerLayout":"standard","motionScheme":"expressive","visitorSwitching":false,"heroOverlayOpacity":45,"bannerIntervalSeconds":8},"hoursAr":"","hoursEn":"","inquiry":{"budget":true,"location":true,"timeline":true,"reference":true},"purpose":"media","articles":{"slug":"news","navAr":"الأخبار","navEn":"News"},"commerce":{"search":true,"sorting":true,"version":1,"branches":[],"pageSize":12,"categories":true,"facetLabels":[],"orderLayout":"split","capabilities":{"shop":true,"pickup":true,"accounts":true,"delivery":true,"ordering":true,"wishlist":true,"downloads":true,"inquiries":true},"relatedItems":true,"categoryParents":{},"orderAttachments":true,"collectCoordinates":false,"inquiryAttachments":true,"branchSelectionRequired":false},"sections":[{"id":"about","visible":true},{"id":"clients","visible":true},{"id":"services","visible":true},{"id":"portfolio","visible":true},{"id":"stats","visible":true},{"id":"reviews","visible":true},{"id":"faq","visible":true},{"id":"cta","visible":false}],"heroStyle":"cinematic","collection":{"slug":"works","navAr":"أعمالنا","navEn":"Catalogue","layout":"media","titleAr":"أعمالنا","titleEn":"Our work","subtitleAr":"نظرة عن قرب على ما نقدمه.","subtitleEn":"A closer look at what we do."},"responseAr":"سيراجع فريقنا رسالتك ويتواصل معك عبر بيانات الاتصال التي تقدمها.","responseEn":"Our team will review your message and contact you using the details you provide.","showEquipment":true,"contactIntroAr":"شاركنا ما يدور في ذهنك. اطرح سؤالك أو أخبر فريقنا بمتطلباتك.","contactIntroEn":"Tell us what you have in mind. Ask a question or share your requirements with our team.","contactTitleAr":"كل حوار بداية لشيء جديد.","contactTitleEn":"Every conversation starts something.","whatsappButton":false},"banners":[{"id":"example-banner","title_ar":"قصص تحرّك الناس","title_en":"Stories that move people","is_active":true,"media_url":"/api/samples/banner-1.svg","created_at":"2026-11-07T18:44:52.390Z","media_type":"image","subtitle_ar":"أفلام العلامات والحملات والمحتوى، من الفكرة إلى الشاشة.","subtitle_en":"Brand films, campaigns and content, from idea to screen.","display_order":0}],"clients":[],"articles":[{"id":"example-article","slug":"welcome-to-our-new-website","tags":[],"category":"news","featured":false,"title_ar":"أهلًا بكم في موقعنا الجديد","title_en":"Welcome to our new website","cover_url":"/api/samples/banner-2.svg","excerpt_ar":"اكتشف الجديد وطرق التواصل معنا.","excerpt_en":"Find out what is new and how to reach us.","publish_at":"2026-11-07T18:44:52.390Z","author_name":"","body_html_ar":"<p>سعداء بزيارتكم. يعرض هذا الموقع ما نقدمه والأعمال التي نفخر بها وطرق التواصل معنا. استبدل هذا المقال التجريبي بأخبارك.</p>","body_html_en":"<p>We are glad you are here. This website shows what we do, the work we are proud of and how to reach us. Replace this sample article with your own news.</p>","seo_title_ar":"","seo_title_en":"","seo_description_ar":"","seo_description_en":""}],"services":[{"id":"example-service-0","nameAr":"أفلام العلامات","nameEn":"Brand films","imageUrl":null,"descriptionAr":"أفلام قائمة على القصة تُظهر قيم علامتك.","descriptionEn":"Story-led films that show what your brand stands for."},{"id":"example-service-1","nameAr":"محتوى التواصل","nameEn":"Social content","imageUrl":null,"descriptionAr":"مقاطع قصيرة مصممة لكل منصة.","descriptionEn":"Short videos made for each platform."},{"id":"example-service-2","nameAr":"التصوير الفوتوغرافي","nameEn":"Photography","imageUrl":null,"descriptionAr":"تصوير المنتجات والأشخاص والأماكن.","descriptionEn":"Product, people and place photography."}],"portfolio":[{"id":"example-item-0","slug":"example-1","title_ar":"أضواء الميناء","title_en":"Harbour Lights","attributes":[],"created_at":"2026-11-07T18:44:52.390Z","client_name":"","is_featured":true,"subtitle_ar":"فيلم علامة تجارية","subtitle_en":"Brand film","aspect_ratio":"16:9","display_order":0,"thumbnail_url":"/api/samples/item-1.svg"},{"id":"example-item-1","slug":"example-2","title_ar":"سباق الصحراء","title_en":"Desert Run","attributes":[],"created_at":"2026-11-07T18:44:52.390Z","client_name":"","is_featured":false,"subtitle_ar":"حملة رياضية","subtitle_en":"Sports campaign","aspect_ratio":"16:9","display_order":1,"thumbnail_url":"/api/samples/item-2.svg"},{"id":"example-item-2","slug":"example-3","title_ar":"المدينة عند الفجر","title_en":"City at Dawn","attributes":[],"created_at":"2026-11-07T18:44:52.390Z","client_name":"","is_featured":false,"subtitle_ar":"فيلم سياحي","subtitle_en":"Tourism film","aspect_ratio":"16:9","display_order":2,"thumbnail_url":"/api/samples/item-3.svg"},{"id":"example-item-3","slug":"example-4","title_ar":"طعم البيت","title_en":"Taste of Home","attributes":[],"created_at":"2026-11-07T18:44:52.390Z","client_name":"","is_featured":false,"subtitle_ar":"سلسلة للتواصل الاجتماعي","subtitle_en":"Social series","aspect_ratio":"16:9","display_order":3,"thumbnail_url":"/api/samples/item-4.svg"}],"categories":[]}'::jsonb, 3, now(), now())
ON CONFLICT (id) DO UPDATE SET draft = EXCLUDED.draft, published = EXCLUDED.published, updated_at = now();

-- ----------------------------------------------------------------------------
-- 12. ITSM SERVICE (SLA Policies, Tickets, Timeline Events)
-- ----------------------------------------------------------------------------
INSERT INTO itsm.sla_policy (priority, response_minutes, resolve_minutes, updated_by, updated_at) VALUES
  ('critical', 30, 240, 'seed:sql', now()),
  ('high', 120, 1440, 'seed:sql', now()),
  ('normal', 480, 4320, 'seed:sql', now()),
  ('low', 1440, 10080, 'seed:sql', now())
ON CONFLICT (priority) DO UPDATE SET response_minutes = EXCLUDED.response_minutes, resolve_minutes = EXCLUDED.resolve_minutes, updated_at = now();

INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad1', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'infrastructure', 'storage', 'high', 'in_progress', 'Post-Production 200TB NAS Storage Capacity Expansion', 'NAS volume at 92% capacity following 8K RAW footage intake from BIC track-day.', 'NAS-VOL-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '4 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '4 days')::timestamptz, NULL, (CURRENT_DATE - INTERVAL '2 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad1', '70da75a0-0445-4b10-ad20-a6366b6a0ad1', 'staff', 'super-admin', 'status_change', 'in_progress', 'in_progress', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '2 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad2', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'hardware', 'calibration', 'medium', 'resolved', 'DaVinci Resolve HDR Reference Monitor Quarterly Calibration', 'Quarterly calibration completed for Sony BVM-HX310 reference monitor with Klein colorimeter.', 'MON-HDR-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '9 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '9 days')::timestamptz, (CURRENT_DATE - INTERVAL '8 days')::timestamptz, (CURRENT_DATE - INTERVAL '10 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad2', '70da75a0-0445-4b10-ad20-a6366b6a0ad2', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '10 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad3', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'software', 'licensing', 'urgent', 'resolved', 'Frame.io Enterprise Seat Licensing Expiry', 'Cloud collaboration seats failed auto-renewal; critical for client reviews today.', 'SW-FRAME-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '15 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '15 days')::timestamptz, (CURRENT_DATE - INTERVAL '14 days')::timestamptz, (CURRENT_DATE - INTERVAL '16 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad3', '70da75a0-0445-4b10-ad20-a6366b6a0ad3', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '16 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad4', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'network', 'wireless', 'high', 'resolved', 'Soundstage High-Throughput Wireless Access Point Intermittent', 'Wireless dropouts affecting Teradek Bolt live iPad monitoring feeds on Stage A.', 'NET-WIFI-02', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '22 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '22 days')::timestamptz, (CURRENT_DATE - INTERVAL '21 days')::timestamptz, (CURRENT_DATE - INTERVAL '23 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad4', '70da75a0-0445-4b10-ad20-a6366b6a0ad4', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '23 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad5', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'hardware', 'firmware', 'normal', 'resolved', 'ARRI Alexa 35 SUP 2.1 Firmware Update & Lens Table Sync', 'Install latest ARRI SUP 2.1 firmware across both Alexa 35 camera bodies.', 'CAM-ALX-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '35 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '35 days')::timestamptz, (CURRENT_DATE - INTERVAL '34 days')::timestamptz, (CURRENT_DATE - INTERVAL '36 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad5', '70da75a0-0445-4b10-ad20-a6366b6a0ad5', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '36 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad6', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'access', 'vpn', 'medium', 'resolved', 'Remote Colorist VPN Access Credentials Setup', 'Configure secure WireGuard tunnel for freelance colorist working from Dubai.', 'VPN-REMOTE-04', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '48 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '48 days')::timestamptz, (CURRENT_DATE - INTERVAL '47 days')::timestamptz, (CURRENT_DATE - INTERVAL '49 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad6', '70da75a0-0445-4b10-ad20-a6366b6a0ad6', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '49 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad7', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'infrastructure', 'backup', 'high', 'resolved', 'LTO-8 Tape Archival Ingest Station Read Error', 'Clean tape head and verify parity on Cold Archive Volume 14.', 'LTO-TAPE-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '60 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '60 days')::timestamptz, (CURRENT_DATE - INTERVAL '59 days')::timestamptz, (CURRENT_DATE - INTERVAL '61 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad7', '70da75a0-0445-4b10-ad20-a6366b6a0ad7', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '61 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad8', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'hardware', 'audio', 'normal', 'resolved', 'Sound Devices 888 Dante Network Clock Desync', 'Resolve PTP clock master conflict between field recorder and studio interface.', 'AUD-DANTE-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '75 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '75 days')::timestamptz, (CURRENT_DATE - INTERVAL '74 days')::timestamptz, (CURRENT_DATE - INTERVAL '76 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad8', '70da75a0-0445-4b10-ad20-a6366b6a0ad8', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '76 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ad9', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'software', 'os', 'low', 'resolved', 'Mac Studio Workstations macOS Sonoma Security Patches', 'Perform scheduled maintenance update across 4 edit suites.', 'MAC-STU-ALL', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '90 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '90 days')::timestamptz, (CURRENT_DATE - INTERVAL '89 days')::timestamptz, (CURRENT_DATE - INTERVAL '91 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ad9', '70da75a0-0445-4b10-ad20-a6366b6a0ad9', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '91 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)
VALUES ('70da75a0-0445-4b10-ad20-a6366b6a0ada', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'hardware', 'power', 'high', 'resolved', 'Studio Soundstage UPS Battery Pack Health Warning', 'Replace aging lead-acid battery cells on 15kVA central UPS system.', 'PWR-UPS-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', (CURRENT_DATE - INTERVAL '110 days')::timestamptz, now() + interval '24 hours', (CURRENT_DATE - INTERVAL '110 days')::timestamptz, (CURRENT_DATE - INTERVAL '109 days')::timestamptz, (CURRENT_DATE - INTERVAL '112 days')::timestamptz, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)
VALUES ('7eda75a0-0445-4b10-ad20-a6366b6a0ada', '70da75a0-0445-4b10-ad20-a6366b6a0ada', 'staff', 'super-admin', 'status_change', 'in_progress', 'resolved', '{"message": "Action logged in service desk"}'::jsonb, (CURRENT_DATE - INTERVAL '112 days')::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 13. NOTIFY SERVICE (In-App Notification Feed)
-- ----------------------------------------------------------------------------
INSERT INTO notify.notification (id, realm, recipient, category, priority, title, body, caller, silent, deliver_at, created_at) VALUES
  ('90da75a0-0445-4b10-ad20-a6366b6a0ad1', 'staff', 'super-admin', 'finance', 'high', 'Invoice Payment Received', 'Payment of 14,500 BHD received from NBB for 65th Anniversary Film.', 'finance-svc', false, now() - interval '1 hour', now() - interval '1 hour'),
  ('90da75a0-0445-4b10-ad20-a6366b6a0ad2', 'staff', 'super-admin', 'inventory', 'normal', 'Equipment Check-in Complete', 'ARRI Alexa 35 & Cooke lenses safely returned to Vault.', 'inventory-svc', false, now() - interval '3 hours', now() - interval '3 hours'),
  ('90da75a0-0445-4b10-ad20-a6366b6a0ad3', 'staff', 'super-admin', 'sales', 'normal', 'New High-Value Deal Qualified', 'Toyota Land Cruiser Offroad TVC proposal requested by E.K. Kanoo.', 'sales-svc', false, now() - interval '5 hours', now() - interval '5 hours'),
  ('90da75a0-0445-4b10-ad20-a6366b6a0ad4', 'staff', 'super-admin', 'hr', 'low', 'Monthly Payroll Run Processed', 'Payroll for October 2026 successfully disbursed to all 12 employees.', 'hr-svc', false, now() - interval '1 day', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

COMMIT;
-- End of SQL Seed