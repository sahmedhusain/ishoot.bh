-- ============================================================================
-- PURE SQL SEED: Northwind Studio W.L.L.
-- Complete multi-microservice fixtures across all 15 schemas
-- Generated: 2026-11-08T15:05:15.228Z
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
VALUES ('c0000000-0000-0000-0000-000000000001', true, '{"companyNameEn":"Northwind Studio W.L.L.","companyNameAr":"استوديو نورثويند ذ.م.م","businessActivity":"media","country":"BH","city":"Manama","contentLanguages":["ar","en"],"primaryLanguage":"ar","crNumber":"CR-000000-0","vatId":"000000000000000","vatEnabled":false,"vatPercentage":10,"defaultCurrency":"BHD","currencyDecimals":3,"timeZone":"Asia/Bahrain","addressEn":"Office 100, Example Tower, Manama, Kingdom of Bahrain","addressAr":"مكتب 100، برج المثال، المنامة، مملكة البحرين","phone":"+97317000000","whatsappPhone":"+97336000000","email":"hello@northwind.example","website":"https://northwind.example","instagramUrl":"https://instagram.com/northwind.example","linkedinUrl":"https://linkedin.com/company/northwind-example","youtubeUrl":"https://youtube.com/@northwind-example","bankName":"Example Bank","bankIban":"BH00EXMP00000000000000","bankAccountNumber":"0000000000","bankSwift":"EXMPBHBM","paymentTermsDays":30,"invoicePrefix":"INV","invoiceNextNumber":104,"receiptPrefix":"RCT","receiptNextNumber":106,"taglineEn":"Cinema Production & Creative Media Studio","taglineAr":"استوديو الإنتاج السينمائي والإعلام الإبداعي","aboutTextEn":"Premier cinematic media production house in the Kingdom of Bahrain, crafting narrative-driven brand films, commercials, and aerial cinematography.","aboutTextAr":"دار إنتاج سينمائي رائدة في مملكة البحرين، متخصصة في صناعة الأفلام الإعلانية الوثائقية والتصوير الجوي السينمائي.","missionEn":"To produce world-class cinematic visual storytelling that elevates regional brands and captures cultural narratives.","missionAr":"إنتاج محتوى بصري سينمائي بمعايير عالمية يرتقي بالهوية الإقليمية ويوثق القصص الثقافية الملهمة.","visionEn":"To become the leading full-service creative film studio and cinema equipment vault in the Arabian Gulf.","visionAr":"أن نكون الاستوديو الإبداعي السينمائي وخزينة المعدات الأكثر موثوقية وتميزاً في منطقة الخليج العربي.","ceoNameEn":"Ali Al-Arrayed","ceoNameAr":"علي العريض","ceoTitleEn":"Managing Director & Executive Producer","ceoTitleAr":"المدير العام والمنتج التنفيذي","ceoQuoteEn":"Every frame we shoot is a commitment to visual excellence, technical perfection, and compelling narrative.","ceoQuoteAr":"كل لقطة نصورها التزام بالتميز البصري، الإتقان التقني، والقصة المؤثرة.","termsEn":"Standard payment terms are net-30 days from invoice issue date. Deliverables remain company property until settlement.","termsAr":"شروط الدفع القياسية هي 30 يوماً من تاريخ الفاتورة. تظل جميع المخرجات ملكاً للشركة حتى اكتمال السداد.","rulesEn":"All crew and equipment deployments strictly adhere to local safety regulations and Ministry of Information filming guidelines.","rulesAr":"تلتزم جميع طواقم ومعدات العمل بضوابط السلامة المعتمدة وتصاريح التصوير الصادرة من وزارة الإعلام.","foundedYear":2018,"mapUrl":"https://maps.google.com/?q=26.2415,50.5369","defaultDiscountLimitPercent":15,"quotationsAlwaysNeedApproval":false,"theme":{"primary":"#2E1065","accent":"#7C3AED","radius":"lg","defaultMode":"system","fonts":{"body":{"kind":"google","family":"IBM Plex Sans Arabic"},"heading":{"kind":"google","family":"Readex Pro"}}},"logoUrl":"/api/files/brand/logo-light_dbf1f2e280f5.png","darkLogoUrl":"/api/files/brand/logo-dark_50ae2cfc6efa.png","iconUrl":"/api/files/brand/icon-light_68b1a95d35cf.png","darkIconUrl":"/api/files/brand/icon-dark_f661f555ebbe.png","stampUrl":"/api/files/brand/stamp_8df038fc524f.png","signatureUrl":"/api/files/brand/signature_28e82e5cdb91.png","websitePublished":true}'::jsonb, false, 1, 'seed:sql', now())
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

INSERT INTO system.document_sequence (kind, prefix, next_number) VALUES ('invoice', 'INV', 105), ('receipt', 'RCT', 107) ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number;

-- ----------------------------------------------------------------------------
-- 3. FILES SERVICE (Upload Objects for Brand Artwork & Fonts)
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
-- 4. IDENTITY SERVICE (Accounts, Staff Roles, Scopes, Permissions)
-- ----------------------------------------------------------------------------

INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'sami-khoury', 'sales@example.com', 'SK0009', '$argon2id$v=19$m=19456,t=2,p=1$mSbMeSezKloR2+1pqltwMA$3jQM9u6DzMnfPMgylalPh11Yk5wllf1bxwe/MoUQCmQ', '{"sales"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'hana-yousef', 'marketing@example.com', 'HY0010', '$argon2id$v=19$m=19456,t=2,p=1$agm6jJxmmZXY+r/xoK9EUQ$hGUkusIA7NVuvBgjDT1eJGO9ZyqHP/XO/Y9xFFa+8Bg', '{"marketing"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'guest', 'guest@example.com', 'GO0011', '$argon2id$v=19$m=19456,t=2,p=1$PzVq/hrVrqoB/nVDhs8hpA$1rtDEGazyISd32w3oJU34XDSt6eV0gaZpYoNTzIfKUg', '{"viewer"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'omar-haddad', 'omar-haddad@example.com', 'OH0002', '$argon2id$v=19$m=19456,t=2,p=1$gfqeZ9CupfsdShN9TJq8VQ$t8dV/7Jhhr3hULEu8D5ATaITqN+ILLu34Kh55T5fPbM', '{"super_admin"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'yusuf-rahman', 'director@example.com', 'YR0003', '$argon2id$v=19$m=19456,t=2,p=1$AEADNvnMM/shq/R6f7nlGQ$i9uupG4/DzvTidEgt7g0wnpELR8M3QlGQeUg13xaGj0', '{"admin"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'layla-nasser', 'finance@example.com', 'LN0004', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"finance_manager"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('it', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', NULL, '$argon2id$v=19$m=19456,t=2,p=1$GmEkIDiHNtqMSGZHMxrYcA$2qeUv1LyB9nTE1XRUU8G8jURidJ56ILWukLHxs16tR8', '{"it_admin"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'karim-fawzi', 'production@example.com', 'KF0005', '$argon2id$v=19$m=19456,t=2,p=1$4uiNDvgDdHMkhUZHTVjgng$8t77aonOfHW1pGw4PQaup0Ct+MIzqXRhmDIXiiVu1Tw', '{"operations_manager"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'super-admin', 'admin@example.com', 'BA0001', '$argon2id$v=19$m=19456,t=2,p=1$xwMGv9Jm36oj/McrASNKuQ$nNvlNRWyXpVmA1gEnFCptjFGEhiIU0CBs5RPim+IZMg', '{"super_admin"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'tariq-saleh', 'producer@example.com', 'TS0006', '$argon2id$v=19$m=19456,t=2,p=1$T08lwxwNbNW1RHcmwMj37A$PX3L8D5Yblz42OMVZbMBr+IMBQJAoBCWqCn7XC5YZ6c', '{"project_lead"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'noor-hamdan', 'editor@example.com', 'NH0007', '$argon2id$v=19$m=19456,t=2,p=1$y4UqK8JHeCseWAVft3x1BQ$CYZ1S/5KATQJBCn5PytMDegtXaAyREgMAg2XpiS4ogQ', '{"editor"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES ('staff', 'faisal-mansour', 'accountant@example.com', 'FM0008', '$argon2id$v=19$m=19456,t=2,p=1$O+stBWvZlrKljxz1CD7PmQ$pLJX+x+OwgbV1aP7zJzWjwBwCFgp5b2+tensIgjhNe0', '{"accountant"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();
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

-- ----------------------------------------------------------------------------
-- 5. HR SERVICE (Departments, Employees, Leaves, Attendance, Payroll)
-- ----------------------------------------------------------------------------
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('920539be-a979-42c1-bb53-a90ea0005289', 'EXEC', 'Executive', 'الإدارة التنفيذية') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('7754f827-b81d-4198-b382-cd5c6afbb561', 'FIN', 'Finance', 'المالية') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('942af868-b755-4460-8930-01492e6ae65b', 'PROD', 'Production', 'الإنتاج') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('34db5948-6e7c-45dd-b290-6c2be78040e4', 'SALES', 'Sales & Marketing', 'المبيعات والتسويق') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000005', 'LOG', 'Logistics & Fleet', 'الخدمات اللوجستية والأسطول') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000006', 'POST', 'Post-Production & Grading', 'ما بعد الإنتاج والمونتاج') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000005', 'LOG', 'Logistics & Fleet', 'الخدمات اللوجستية والأسطول') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000006', 'POST', 'Post-Production & Grading', 'ما بعد الإنتاج والمونتاج') ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('04c696d7-f5e1-408c-8723-205b567d6119', 'OH0002', 'Omar', 'Haddad', 'عمر', 'حداد', 'omar-haddad@example.com', '+97317000000', 'Chief Executive Officer', 'الرئيس التنفيذي / مدير عام', '920539be-a979-42c1-bb53-a90ea0005289', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1200, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('519c98db-889e-4b93-ba19-0015bde5a465', 'YR0003', 'Yusuf', 'Rahman', 'يوسف', 'رحمن', 'director@example.com', '+97336002200', 'Managing Director', 'مدير العمليات العامة', '920539be-a979-42c1-bb53-a90ea0005289', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1300, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('71190c9f-71eb-41a5-8636-7f2ad6960be8', 'LN0004', 'Layla', 'Nasser', 'ليلى', 'ناصر', 'finance@example.com', '+97336003300', 'Finance Manager', 'مدير المالية والمحاسبة', '7754f827-b81d-4198-b382-cd5c6afbb561', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1400, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'KF0005', 'Karim', 'Fawzi', 'كريم', 'فوزي', 'production@example.com', '+97336004400', 'Head of Production', 'مدير إدارة الإنتاج السينمائي', '942af868-b755-4460-8930-01492e6ae65b', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1500, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 'TS0006', 'Tariq', 'Saleh', 'طارق', 'صالح', 'producer@example.com', '+97336005500', 'Lead Producer', 'منتج رئيسي / مدير مشاريع', '942af868-b755-4460-8930-01492e6ae65b', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1600, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 'NH0007', 'Noor', 'Hamdan', 'نور', 'حمدان', 'editor@example.com', '+97336006600', 'Senior Editor & Colorist', 'محرر ومونتير سينمائي أول', '942af868-b755-4460-8930-01492e6ae65b', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1700, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('17fcd4f9-6dbd-491e-a392-cc3a9a42f277', 'FM0008', 'Faisal', 'Mansour', 'فيصل', 'منصور', 'accountant@example.com', '+97336007700', 'Senior Accountant', 'محاسب مالي أول', '7754f827-b81d-4198-b382-cd5c6afbb561', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1800, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('67a177f9-65e6-4e40-b0a9-f1168e276326', 'SK0009', 'Sami', 'Khoury', 'سامي', 'خوري', 'sales@example.com', '+97336008811', 'Sales & Business Development Manager', 'مدير تطوير الأعمال والمبيعات', '34db5948-6e7c-45dd-b290-6c2be78040e4', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 1900, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('3b06b26b-5eb5-4395-837e-4e24d0a148de', 'HY0010', 'Hana', 'Yousef', 'هناء', 'يوسف', 'marketing@example.com', '+97336008822', 'Marketing & PR Specialist', 'أخصائي التسويق والعلاقات العامة', '34db5948-6e7c-45dd-b290-6c2be78040e4', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 2000, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)
VALUES ('3e911960-0003-4981-ac1a-8085dd66a212', 'GO0011', 'Guest', 'Observer', 'مراقب', 'عام', 'guest@example.com', '+97336008800', 'Guest Observer', 'مراقب خارجي معتمد', '942af868-b755-4460-8930-01492e6ae65b', (CURRENT_DATE - INTERVAL '365 days')::date, 'active', 2100, 250, 75, 0.000, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Leave requests
INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at) VALUES
  ('lr-001', '04c696d7-f5e1-408c-8723-205b567d6119', 'annual', (CURRENT_DATE - INTERVAL '40 days')::date, (CURRENT_DATE - INTERVAL '35 days')::date, 5.0, 'approved', 'Annual family vacation', now(), now()),
  ('lr-002', '519c98db-889e-4b93-ba19-0015bde5a465', 'sick', (CURRENT_DATE - INTERVAL '15 days')::date, (CURRENT_DATE - INTERVAL '14 days')::date, 2.0, 'approved', 'Medical recovery with doctor note', now(), now()),
  ('lr-003', '71190c9f-71eb-41a5-8636-7f2ad6960be8', 'annual', (CURRENT_DATE + INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '15 days')::date, 5.0, 'pending', 'Planned personal travel', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Attendance entries
INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at) VALUES
  ('att-001', '04c696d7-f5e1-408c-8723-205b567d6119', CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'On-site studio setup', now()),
  ('att-002', '519c98db-889e-4b93-ba19-0015bde5a465', CURRENT_DATE, (CURRENT_DATE + TIME '09:00:00')::timestamptz, NULL, 'present', 'Editing suite A', now())
ON CONFLICT (id) DO NOTHING;

-- Historical Payroll Runs
INSERT INTO hr.payroll_run (id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at) VALUES
  ('pr-2026-09', 9, 2026, 'completed', 14500.000, 750.000, 13750.000, 'BHD', (CURRENT_DATE - INTERVAL '40 days')::timestamptz, 'super-admin', now()),
  ('pr-2026-10', 10, 2026, 'completed', 14500.000, 750.000, 13750.000, 'BHD', (CURRENT_DATE - INTERVAL '10 days')::timestamptz, 'super-admin', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status) VALUES
  ('pi-09-01', 'pr-2026-09', '04c696d7-f5e1-408c-8723-205b567d6119', 1800.000, 400.000, 150.000, 2050.000, 'paid'),
  ('pi-09-02', 'pr-2026-09', '519c98db-889e-4b93-ba19-0015bde5a465', 1500.000, 325.000, 120.000, 1705.000, 'paid'),
  ('pi-10-01', 'pr-2026-10', '04c696d7-f5e1-408c-8723-205b567d6119', 1800.000, 400.000, 150.000, 2050.000, 'paid'),
  ('pi-10-02', 'pr-2026-10', '519c98db-889e-4b93-ba19-0015bde5a465', 1500.000, 325.000, 120.000, 1705.000, 'paid')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. SALES SERVICE (Contacts, Deals across all stages, Quotations, Inquiries)
-- ----------------------------------------------------------------------------
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('6da302d1-002d-448c-8bb3-b57267ed897b', 'Gulfwave', 'Representative', 'contact@gulfwave.example', '+97317000010', 'Gulfwave', 'client', 'active', 'Primary corporate client account for Gulfwave.', '{"demo","production","gulfwave"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('8377fdfc-0f8f-4318-9347-6a4cc3fa04b2', 'Falcon Airways', 'Representative', 'contact@falcon-airways.example', '+97317000011', 'Falcon Airways', 'client', 'active', 'Primary corporate client account for Falcon Airways.', '{"demo","production","falcon-airways"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('b8867d87-042a-47cc-b51c-60030f74ea13', 'Summit Aluminium', 'Representative', 'contact@summit-aluminium.example', '+97317000012', 'Summit Aluminium', 'client', 'active', 'Primary corporate client account for Summit Aluminium.', '{"demo","production","summit-aluminium"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('d44a3635-10c1-45f9-8e86-4d12a16959a5', 'Harbor National Bank (HNB)', 'Representative', 'contact@harbor-national-bank.example', '+97317000013', 'Harbor National Bank (HNB)', 'client', 'active', 'Primary corporate client account for Harbor National Bank (HNB).', '{"demo","production","harbor-national-bank"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('bf4f5402-c649-43e7-99f9-40287dd6cc5f', 'Orbit Telecom', 'Representative', 'contact@orbit-telecom.example', '+97317000014', 'Orbit Telecom', 'client', 'active', 'Primary corporate client account for Orbit Telecom.', '{"demo","production","orbit-telecom"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('0dea1494-7d86-4190-be16-7735724a4ca1', 'Nexa Mobile', 'Representative', 'contact@nexa-mobile.example', '+97317000015', 'Nexa Mobile', 'client', 'active', 'Primary corporate client account for Nexa Mobile.', '{"demo","production","nexa-mobile"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('ad7345d0-a388-4b06-abd5-c7ee701a5513', 'Delta Energies', 'Representative', 'contact@delta-energies.example', '+97317000016', 'Delta Energies', 'client', 'active', 'Primary corporate client account for Delta Energies.', '{"demo","production","delta-energies"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('2555c520-11c5-4f07-822e-1934c8dfebbe', 'Pearl Holding Company', 'Representative', 'contact@pearl-holding-company.example', '+97317000017', 'Pearl Holding Company', 'client', 'active', 'Primary corporate client account for Pearl Holding Company.', '{"demo","production","pearl-holding-company"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('66afd81f-3071-4bb7-8d19-c36e1f5ca76c', 'Bayview Grand Hotel', 'Representative', 'contact@bayview-grand-hotel.example', '+97317000018', 'Bayview Grand Hotel', 'client', 'active', 'Primary corporate client account for Bayview Grand Hotel.', '{"demo","production","bayview-grand-hotel"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('20940bb1-586a-4890-bb23-f0979b15511c', 'Regional Investment Board', 'Representative', 'contact@regional-investment-board.example', '+97317000019', 'Regional Investment Board', 'client', 'active', 'Primary corporate client account for Regional Investment Board.', '{"demo","production","regional-investment-board"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('ca2b7adc-903a-4173-8298-00039b40ee55', 'Island Tourism & Events Board', 'Representative', 'contact@island-tourism-events-board.example', '+97317000020', 'Island Tourism & Events Board', 'client', 'active', 'Primary corporate client account for Island Tourism & Events Board.', '{"demo","production","island-tourism-events-board"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('2ba296fa-41e0-4dc5-b619-27f66608e57d', 'Seafront Properties', 'Representative', 'contact@seafront-properties.example', '+97317000021', 'Seafront Properties', 'client', 'active', 'Primary corporate client account for Seafront Properties.', '{"demo","production","seafront-properties"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('c13fc361-8e05-4079-8f0d-efca24b9acc6', 'Nova Digital', 'Representative', 'contact@nova-digital.example', '+97317000022', 'Nova Digital', 'client', 'active', 'Primary corporate client account for Nova Digital.', '{"demo","production","nova-digital"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('7da38d44-a3e4-4038-829a-96b746d2f4bf', 'Desert Speedway (DSW)', 'Representative', 'contact@desert-speedway.example', '+97317000023', 'Desert Speedway (DSW)', 'client', 'active', 'Primary corporate client account for Desert Speedway (DSW).', '{"demo","production","desert-speedway"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('653f6aaa-2cc2-4b4d-8629-25d7c3cc8b81', 'NovaPay FinTech', 'Representative', 'contact@novapay-fintech.example', '+97317000024', 'NovaPay FinTech', 'client', 'active', 'Primary corporate client account for NovaPay FinTech.', '{"demo","production","novapay-fintech"}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)
VALUES ('93b9c821-47b1-4366-8ef0-47880d46efda', 'Palm Golf Club', 'Representative', 'contact@palm-golf-club.example', '+97317000025', 'Palm Golf Club', 'client', 'active', 'Primary corporate client account for Palm Golf Club.', '{"demo","production","palm-golf-club"}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('969985f6-0f01-46b0-b249-5a2dc9a4c302', 'Gulfwave 5G Commercial Campaign', '6da302d1-002d-448c-8bb3-b57267ed897b', 'proposal', 4500, 'BHD', 65, (CURRENT_DATE + INTERVAL '15 days')::date, 'open', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'Prime commercial campaign for Gulfwave 5G network rollout.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('ff0d29e4-9f22-45b6-bc62-1d41e52dd559', 'Falcon Airways Fleet Brand Story', '8377fdfc-0f8f-4318-9347-6a4cc3fa04b2', 'negotiation', 6000, 'BHD', 80, (CURRENT_DATE + INTERVAL '15 days')::date, 'open', '67a177f9-65e6-4e40-b0a9-f1168e276326', 'In-flight entertainment and fleet brand documentary series.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('d575c254-f371-45f9-97ba-e4f094755e14', 'Tourism Kingdom Showcase Film', 'ca2b7adc-903a-4173-8298-00039b40ee55', 'closed_won', 12000, 'BHD', 100, (CURRENT_DATE + INTERVAL '15 days')::date, 'won', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', '8K aerial and ground production showcasing cultural landmarks.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('1be2fbe8-3c04-4889-bf29-922787977335', 'Harbor National Bank Digital Banking TVC', 'd44a3635-10c1-45f9-8e86-4d12a16959a5', 'closed_won', 8500, 'BHD', 100, (CURRENT_DATE + INTERVAL '15 days')::date, 'won', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'Television and digital commercial for mobile banking launch.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('e0a08fdc-df79-48f1-aecf-f3464ace27c3', 'Bahrain Circuit 2026 Season Opener Film', '7da38d44-a3e4-4038-829a-96b746d2f4bf', 'qualification', 15000, 'BHD', 40, (CURRENT_DATE + INTERVAL '15 days')::date, 'open', '67a177f9-65e6-4e40-b0a9-f1168e276326', 'High-speed track coverage and pre-season documentary trailer.', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-extra-001', 'Bayview Grand Hotel 360 Virtual Tour', '6da302d1-002d-448c-8bb3-b57267ed897b', 'closed_lost', 3500, 'BHD', 0, (CURRENT_DATE + INTERVAL '15 days')::date, 'lost', '04c696d7-f5e1-408c-8723-205b567d6119', 'Client postponed marketing spend until next quarter', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)
VALUES ('deal-extra-002', 'NovaPay Corporate Fintech Explainers', '8377fdfc-0f8f-4318-9347-6a4cc3fa04b2', 'negotiation', 7200, 'BHD', 75, (CURRENT_DATE + INTERVAL '15 days')::date, 'open', '519c98db-889e-4b93-ba19-0015bde5a465', 'Contract terms under review by legal counsel', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at) VALUES
  ('deal-extra-001', 'Bayview Grand Hotel 360 Virtual Tour', '6da302d1-002d-448c-8bb3-b57267ed897b', 'closed_lost', 3500.000, 'BHD', 0, (CURRENT_DATE - INTERVAL '20 days')::date, 'lost', '04c696d7-f5e1-408c-8723-205b567d6119', 'Client postponed marketing spend until next quarter', now(), now()),
  ('deal-extra-002', 'NovaPay Corporate Fintech Explainers', '8377fdfc-0f8f-4318-9347-6a4cc3fa04b2', 'negotiation', 7200.000, 'BHD', 75, (CURRENT_DATE + INTERVAL '30 days')::date, 'open', '519c98db-889e-4b93-ba19-0015bde5a465', 'Contract terms under review by legal counsel', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('4823dae2-54fd-4fd6-98d0-87fa217834a8', 'QTE-2026-000001', '6da302d1-002d-448c-8bb3-b57267ed897b', '969985f6-0f01-46b0-b249-5a2dc9a4c302', 'sent', 3500, 0, 10, 350, 3850, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, '50% advance upon confirmation, balance upon delivery.', 'Includes ARRI Alexa 35 package and prime lenses.', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('f5c023b7-e4d0-4086-a46e-28b6c44e06f7', 'QTE-2026-000002', '8377fdfc-0f8f-4318-9347-6a4cc3fa04b2', 'ff0d29e4-9f22-45b6-bc62-1d41e52dd559', 'sent', 6000, 300, 10, 570, 6270, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Net 30 days from invoice date.', 'Includes 4K master export and DaVinci color grading.', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('8c14b29a-852d-4199-9faa-731ccc911a7e', 'QTE-2026-000003', 'ca2b7adc-903a-4173-8298-00039b40ee55', 'd575c254-f371-45f9-97ba-e4f094755e14', 'accepted', 12000, 1200, 10, 1080, 11880, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, 'Payment upon milestone delivery.', 'Accepted by Tourism Board executive committee.', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)
VALUES ('7a370f0e-94f7-4ac3-8a62-4bdf03183963', 'QTE-2026-000004', 'd44a3635-10c1-45f9-8e86-4d12a16959a5', '1be2fbe8-3c04-4889-bf29-922787977335', 'accepted', 8500, 500, 10, 800, 8800, 'BHD', (CURRENT_DATE + INTERVAL '30 days')::date, '50% advance, 50% upon delivery.', 'Approved for principal photography and post.', now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('d2fd40ca-1e8b-4d68-bf4f-1334d7344b01', '4823dae2-54fd-4fd6-98d0-87fa217834a8', 'Arri Alexa 35 Camera Package (2 Days)', 2, 1000, 2000, 0)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('2f6689de-de53-49df-8db5-7b39b175f03a', '4823dae2-54fd-4fd6-98d0-87fa217834a8', 'Cinema Prime Lenses (Set of 5)', 2, 500, 1000, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('66f056bc-c28f-44f1-98e5-958f42f01475', '4823dae2-54fd-4fd6-98d0-87fa217834a8', 'Grip & Sound Equipment Package', 1, 500, 500, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('b01494dd-dcd4-463c-b4bd-6122cb469fbe', 'f5c023b7-e4d0-4086-a46e-28b6c44e06f7', 'Commercial Film Production — In-flight Brand Story', 1, 4500, 4500, 0)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('b468fd55-215c-43a1-846b-852a449872f1', 'f5c023b7-e4d0-4086-a46e-28b6c44e06f7', 'DaVinci Resolve HDR Color Grading & Mastering', 1, 1500, 1500, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('493d55e7-36c7-4624-b3fd-30d2659cfac9', '8c14b29a-852d-4199-9faa-731ccc911a7e', 'Tourism Kingdom Showcase Film (8K Raw)', 1, 7000, 7000, 0)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('8646cdfe-a26b-450e-9bab-92530afd610c', '8c14b29a-852d-4199-9faa-731ccc911a7e', 'Heavy-Lifter Drone Cinematography with Operator', 2, 1500, 3000, 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('3204a939-956d-4f5f-a965-a12f1b9aa7c1', '8c14b29a-852d-4199-9faa-731ccc911a7e', 'Original Cinematic Orchestral Score & Sound Design', 1, 2000, 2000, 2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('8a87db21-9042-4aa7-bafc-1afb092b7220', '7a370f0e-94f7-4ac3-8a62-4bdf03183963', 'Digital Banking Mobile App Commercial TVC', 1, 6000, 6000, 0)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)
VALUES ('f5661226-6fcb-4fe6-9090-9c802366bb16', '7a370f0e-94f7-4ac3-8a62-4bdf03183963', 'Studio Soundstage & Lighting Package (3 Days)', 1, 2500, 2500, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales.inquiry (id, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('40846238-a5ec-45f1-b17d-fc3e9c2d6c08', 'Gulfwave 5G Commercial Pickup Day', 'Requesting studio crew, Arri Alexa 35 package, and director for 5G Ultra commercial pickup day.', 'Hamad Al-Romaihi', 'h.alromaihi@gulfwave.example', '+97339441122', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('8d84e373-df97-496f-a404-921cceecc11c', 'Exhibition World Bahrain Drone Scope Change', 'Scope change: Additional 4K FPV drone passes and sunset hyperlapse shots over Exhibition World Bahrain.', 'Tariq Al-Doseri', 't.aldoseri@iteb.example', '+97336119900', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sales.inquiry (id, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)
VALUES ('a41d57a0-77a0-4d6d-be9f-43b111911493', 'NBB Annual Shareholders Summit Video Coverage', 'Requesting multi-camera live streaming and highlight video production for NBB Annual Summit.', 'Lulwa Al-Sada', 'l.alsada@nbb.example', '+97339887766', 'new', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. FINANCE SERVICE (Expense Categories, Expenses, Invoices across aging buckets, Payments)
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

-- Historical & Current Expenses
INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at) VALUES
  ('exp-01', 'Location scouting, generator fuel & transport', 320.000, 'BHD', 'expcat-03', (CURRENT_DATE - INTERVAL '145 days')::date, 'Manama Transport Co.', 'approved', 'Southern Governorate scouting', now(), now()),
  ('exp-02', 'High-Output HMI & Astera Lighting Package Sub-Lease', 650.000, 'BHD', 'expcat-01', (CURRENT_DATE - INTERVAL '115 days')::date, 'Gulf Optics & Grip', 'approved', 'Astera Titan tubes for night shoot', now(), now()),
  ('exp-03', 'Sound design & 7.1 surround mixing engineer wage', 480.000, 'BHD', 'expcat-02', (CURRENT_DATE - INTERVAL '85 days')::date, 'Bahrain Sound Labs', 'approved', 'Cinema audio mastering', now(), now()),
  ('exp-04', 'Aerial drone airspace clearance fee', 550.000, 'BHD', 'expcat-01', (CURRENT_DATE - INTERVAL '55 days')::date, 'Civil Aviation Affairs (CAA)', 'approved', 'Restricted zone permit', now(), now()),
  ('exp-05', 'Production crew catering & craft services', 450.000, 'BHD', 'expcat-03', (CURRENT_DATE - INTERVAL '32 days')::date, 'Gourmet Catering Co.', 'approved', 'Full day catering 35 crew', now(), now()),
  ('exp-06', 'DaVinci Resolve cloud collaboration server', 120.000, 'BHD', 'expcat-05', (CURRENT_DATE - INTERVAL '25 days')::date, 'Blackmagic Cloud Services', 'approved', 'Remote color grading server', now(), now()),
  ('exp-07', 'Filming permit — Bahrain Bay Coastal Sequence', 180.000, 'BHD', 'expcat-06', (CURRENT_DATE - INTERVAL '5 days')::date, 'Information Affairs Authority', 'approved', 'Official coastal filming permit', now(), now()),
  ('exp-08', 'Studio Soundstage High-Capacity AC & Power Load', 420.000, 'BHD', 'expcat-04', CURRENT_DATE, 'Electricity & Water Authority', 'approved', '18KW light power supply', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Invoices across aging buckets with dynamic date arithmetic
INSERT INTO finance.invoice (id, invoice_number, contact_id, deal_id, quotation_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at) VALUES
  -- Historical Paid Invoices
  ('inv-hist-01', 'INV-HIST-0001', 'bf4f5402-c649-43e7-99f9-40287dd6cc5f', 'e0a08fdc-df79-48f1-aecf-f3464ace27c3', NULL, 'paid', (CURRENT_DATE - INTERVAL '150 days')::date, (CURRENT_DATE - INTERVAL '120 days')::date, 4000.000, 0.000, 10.00, 400.000, 4400.000, 4400.000, 0.000, 'BHD', 'Bahrain Circuit F1 Pre-Season Cinematography', 'Net 30 days', now(), now()),
  ('inv-hist-02', 'INV-HIST-0002', '8377fdfc-0f8f-4318-9347-6a4cc3fa04b2', 'ff0d29e4-9f22-45b6-bc62-1d41e52dd559', NULL, 'paid', (CURRENT_DATE - INTERVAL '120 days')::date, (CURRENT_DATE - INTERVAL '90 days')::date, 9000.000, 0.000, 10.00, 900.000, 9900.000, 9900.000, 0.000, 'BHD', 'Falcon Airways Fleet Brand Story 4K Master', 'Net 30 days', now(), now()),
  ('inv-hist-03', 'INV-HIST-0003', 'b8867d87-042a-47cc-b51c-60030f74ea13', 'd575c254-f371-45f9-97ba-e4f094755e14', NULL, 'paid', (CURRENT_DATE - INTERVAL '90 days')::date, (CURRENT_DATE - INTERVAL '60 days')::date, 6000.000, 0.000, 10.00, 600.000, 6600.000, 6600.000, 0.000, 'BHD', 'Bahrain Bay Sunset Hyperlapse & Drone Photography', 'Net 30 days', now(), now()),
  ('inv-hist-04', 'INV-HIST-0004', 'd44a3635-10c1-45f9-8e86-4d12a16959a5', '1be2fbe8-3c04-4889-bf29-922787977335', NULL, 'paid', (CURRENT_DATE - INTERVAL '60 days')::date, (CURRENT_DATE - INTERVAL '30 days')::date, 7000.000, 0.000, 10.00, 700.000, 7700.000, 7700.000, 0.000, 'BHD', 'Digital Banking TVC Teasers & Cutdowns', 'Net 30 days', now(), now()),
  -- Overdue Invoices for Aging Buckets
  ('inv-aging-01', 'INV-AGING-0001', '6da302d1-002d-448c-8bb3-b57267ed897b', '969985f6-0f01-46b0-b249-5a2dc9a4c302', NULL, 'partially_paid', (CURRENT_DATE - INTERVAL '38 days')::date, (CURRENT_DATE - INTERVAL '8 days')::date, 5000.000, 0.000, 10.00, 500.000, 5500.000, 2750.000, 2750.000, 'BHD', 'Corporate Identity Docu-Series Phase 1 (Overdue 8d)', 'Net 30 days', now(), now()),
  ('inv-aging-02', 'INV-AGING-0002', 'bf4f5402-c649-43e7-99f9-40287dd6cc5f', 'e0a08fdc-df79-48f1-aecf-f3464ace27c3', NULL, 'overdue', (CURRENT_DATE - INTERVAL '75 days')::date, (CURRENT_DATE - INTERVAL '45 days')::date, 2000.000, 0.000, 10.00, 200.000, 2200.000, 0.000, 2200.000, 'BHD', 'Speedway Rigging & Wireless Video Feed (Overdue 45d)', 'Net 30 days', now(), now()),
  ('inv-aging-03', 'INV-AGING-0003', '8377fdfc-0f8f-4318-9347-6a4cc3fa04b2', 'ff0d29e4-9f22-45b6-bc62-1d41e52dd559', NULL, 'overdue', (CURRENT_DATE - INTERVAL '105 days')::date, (CURRENT_DATE - INTERVAL '75 days')::date, 1500.000, 0.000, 10.00, 150.000, 1650.000, 0.000, 1650.000, 'BHD', 'Aviation Safety Briefing Animation (Overdue 75d)', 'Net 30 days', now(), now()),
  ('inv-aging-04', 'INV-AGING-0004', 'd44a3635-10c1-45f9-8e86-4d12a16959a5', '1be2fbe8-3c04-4889-bf29-922787977335', NULL, 'overdue', (CURRENT_DATE - INTERVAL '140 days')::date, (CURRENT_DATE - INTERVAL '110 days')::date, 1200.000, 0.000, 10.00, 120.000, 1320.000, 0.000, 1320.000, 'BHD', 'Archival Footage 4K Restoration (Overdue 110d)', 'Net 30 days', now(), now()),
  -- Current Invoices
  ('inv-curr-01', 'DEMO-INV-0001', '6da302d1-002d-448c-8bb3-b57267ed897b', '969985f6-0f01-46b0-b249-5a2dc9a4c302', '4823dae2-54fd-4fd6-98d0-87fa217834a8', 'partially_paid', CURRENT_DATE, (CURRENT_DATE + INTERVAL '25 days')::date, 3500.000, 0.000, 10.00, 350.000, 3850.000, 1925.000, 1925.000, 'BHD', 'Gulfwave 5G Commercial (50% Deposit Paid)', '50% deposit, balance on delivery', now(), now()),
  ('inv-curr-02', 'INV-2026-0001', 'b8867d87-042a-47cc-b51c-60030f74ea13', 'd575c254-f371-45f9-97ba-e4f094755e14', '8c14b29a-852d-4199-9faa-731ccc911a7e', 'paid', (CURRENT_DATE - INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '20 days')::date, 10800.000, 0.000, 10.00, 1080.000, 11880.000, 11880.000, 0.000, 'BHD', 'Exhibition World Bahrain Showcase (100% Paid)', 'Milestone settlement', now(), now()),
  ('inv-curr-03', 'INV-2026-0002', 'd44a3635-10c1-45f9-8e86-4d12a16959a5', '1be2fbe8-3c04-4889-bf29-922787977335', '7a370f0e-94f7-4ac3-8a62-4bdf03183963', 'sent', (CURRENT_DATE - INTERVAL '5 days')::date, (CURRENT_DATE + INTERVAL '28 days')::date, 8000.000, 0.000, 10.00, 800.000, 8800.000, 0.000, 8800.000, 'BHD', 'Digital Banking TVC Principal Photography & Post', '50% advance, balance on master export', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order) VALUES
  ('ii-01', 'inv-hist-01', 'Bahrain Circuit F1 Pre-Season Cinematography & FPV Drone', 1, 4000.000, 4000.000, 0),
  ('ii-02', 'inv-hist-02', 'Falcon Airways In-Flight Brand Story 4K Master Export', 1, 9000.000, 9000.000, 0),
  ('ii-03', 'inv-hist-03', 'Bahrain Bay Sunset Hyperlapse & Drone Photography Package', 1, 6000.000, 6000.000, 0),
  ('ii-04', 'inv-hist-04', 'Digital Banking Mobile Experience Campaign (Teasers & Cutdowns)', 1, 7000.000, 7000.000, 0),
  ('ii-05', 'inv-aging-01', 'Corporate Identity Documentary Series Phase 1', 1, 5000.000, 5000.000, 0),
  ('ii-06', 'inv-aging-02', 'Speedway Track-Day Cinema Rigging & Wireless Video Feed', 1, 2000.000, 2000.000, 0),
  ('ii-07', 'inv-aging-03', 'Aviation Safety Briefing Animated Graphics & Sound Design', 1, 1500.000, 1500.000, 0),
  ('ii-08', 'inv-aging-04', 'Archival Footage Licensing & 4K Digital Restoration', 1, 1200.000, 1200.000, 0),
  ('ii-09', 'inv-curr-01', 'Gulfwave 5G Commercial Production (50% Deposit)', 1, 3500.000, 3500.000, 0),
  ('ii-10', 'inv-curr-02', 'Exhibition World Inauguration Film (100% Paid)', 1, 10800.000, 10800.000, 0),
  ('ii-11', 'inv-curr-03', 'Digital Banking TVC Principal Photography & Post', 1, 8000.000, 8000.000, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at) VALUES
  ('pay-01', 'RCT-HIST-0001', 'inv-hist-01', 'bf4f5402-c649-43e7-99f9-40287dd6cc5f', 4400.000, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '135 days')::date, 'PAY-F1-0001', 'completed', 'Settled via wire', now()),
  ('pay-02', 'RCT-HIST-0002', 'inv-hist-02', '8377fdfc-0f8f-4318-9347-6a4cc3fa04b2', 9900.000, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '105 days')::date, 'PAY-FLC-0002', 'completed', 'Settled via wire', now()),
  ('pay-03', 'RCT-HIST-0003', 'inv-hist-03', 'b8867d87-042a-47cc-b51c-60030f74ea13', 6600.000, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '75 days')::date, 'PAY-BHT-0003', 'completed', 'Settled via wire', now()),
  ('pay-04', 'RCT-HIST-0004', 'inv-hist-04', 'd44a3635-10c1-45f9-8e86-4d12a16959a5', 7700.000, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '45 days')::date, 'PAY-HNB-0004', 'completed', 'Settled via wire', now()),
  ('pay-05', 'RCT-AGING-0001', 'inv-aging-01', '6da302d1-002d-448c-8bb3-b57267ed897b', 2750.000, 'BHD', 'benefit_pay', (CURRENT_DATE - INTERVAL '35 days')::date, 'BENEFIT-331201', 'completed', 'Settled via BenefitPay', now()),
  ('pay-06', 'DEMO-RCT-0001', 'inv-curr-01', '6da302d1-002d-448c-8bb3-b57267ed897b', 1925.000, 'BHD', 'benefit_pay', CURRENT_DATE, 'DEMO-PAY-0001', 'completed', '50% advance', now()),
  ('pay-07', 'RCT-2026-0001', 'inv-curr-02', 'b8867d87-042a-47cc-b51c-60030f74ea13', 11880.000, 'BHD', 'bank_transfer', CURRENT_DATE, 'PAY-BAT-2026-9921', 'completed', 'Full settlement', now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. INVENTORY SERVICE (Categories, Warehouses, Locations, Products, Stock)
-- ----------------------------------------------------------------------------
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active) VALUES ('60ec2df4-551c-4de5-88e6-a059e78439dc', 'cinema-cameras', 'Cinema Cameras', 'كاميرات سينمائية', 'Large format and Super35 digital cinema camera packages', 'كاميرات سينمائية رقمية للإطار الكامل وسوبر 35', 1, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active) VALUES ('46202273-9e02-42b2-885f-fd38c18e1ee0', 'cinema-lenses', 'Cinema Lenses', 'عدسات سينمائية', 'Anamorphic and spherical cinema prime and zoom lenses', 'عدسات سينمائية أنامورفيك وبرايم وزوم', 2, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active) VALUES ('00fdc6d1-98ef-4d60-98e1-a62f0876d156', 'lighting-grip', 'Lighting & Grip', 'إضاءة وتجهيزات', 'Professional LED, HMI fixtures, wireless tubes and stabilizers', 'إضاءات LED متطورة ومعدات تثبيت وموازنة', 3, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active) VALUES ('8ea0e0ca-6f8c-4279-81f6-0308a6a57fc1', 'aerial-drones', 'Aerial Drones', 'تصوير جوي ودرون', 'Heavy-lifter and cinema drones with raw recording capabilities', 'طائرات درون سينمائية متقدمة لتسجيل RAW', 4, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active) VALUES ('e5fb322f-f5f5-43bc-8898-bc7187cc790f', 'field-audio', 'Field Audio', 'هندسة الصوت الميداني', 'Multi-channel field recorders, mixers and wireless boom mics', 'أجهزة تسجيل صوت ميداني متعدد القنوات وميكروفونات لاسلكية', 5, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active) VALUES ('20670350-e2ac-447c-8d46-72491e1828a4', 'post-production', 'Post-Production', 'ما بعد الإنتاج والتلوين', 'Color grading hardware control panels and HDR master suites', 'لوحات تحكم التلوين السينمائي وأجهزة المونتاج', 6, true) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.warehouse (id, code, name_en, name_ar, address, is_active, is_default, sort_order, created_at, updated_at) VALUES ('3a2939ad-f352-4fe0-a639-935422fe3f29', 'DEMO', 'Main Cinema Equipment Vault', 'مخزن المعدات السينمائية الرئيسي', 'Seef District, Manama, Kingdom of Bahrain', true, true, 1, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.warehouse (id, code, name_en, name_ar, address, is_active, is_default, sort_order, created_at, updated_at) VALUES ('7da571bc-d198-4fcf-92d6-b0a03637ed4d', 'STUDIO', 'Seef Soundstage & Studio Vault', 'مخزن استوديو السيف السينمائي', 'Seef District, Kingdom of Bahrain', true, false, 2, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_location (id, warehouse_id, code, name, is_active, created_at) VALUES ('9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', '3a2939ad-f352-4fe0-a639-935422fe3f29', 'VAULT-01', 'Primary Gear Vault', true, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_location (id, warehouse_id, code, name, is_active, created_at) VALUES ('c0121511-2fba-4bbd-8a68-ffb3ba9f566b', '7da571bc-d198-4fcf-92d6-b0a03637ed4d', 'STUDIO-BAY', 'Stage Lighting & Rigging Bay', true, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('65553066-46ec-4d81-8055-265fcf269b9b', 'DEMO-CAM-001', 'ARRI Alexa 35 Cinema Package', 'حزمة كاميرا آري أليكسا 35 السينمائية', '4K RAW Super35 Cinema Camera with LPL mount', 'كاميرا سينمائية فائقة الوضوح 4K RAW', '60ec2df4-551c-4de5-88e6-a059e78439dc', 12000, 1000, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || '65553066-46ec-4d81-8055-265fcf269b9b', '65553066-46ec-4d81-8055-265fcf269b9b', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || '65553066-46ec-4d81-8055-265fcf269b9b', '65553066-46ec-4d81-8055-265fcf269b9b', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 12000, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('8f1d7f9b-69d5-4fa8-a984-fba7a636dfe4', 'DEMO-CAM-002', 'RED V-Raptor XL 8K VV Package', 'حزمة كاميرا ريد رابتور 8K السينمائية', '8K Vista Vision Cinema Camera System with PL Mount', 'نظام كاميرا سينمائي بدقة 8K مع مانت PL', '60ec2df4-551c-4de5-88e6-a059e78439dc', 14000, 1200, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || '8f1d7f9b-69d5-4fa8-a984-fba7a636dfe4', '8f1d7f9b-69d5-4fa8-a984-fba7a636dfe4', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || '8f1d7f9b-69d5-4fa8-a984-fba7a636dfe4', '8f1d7f9b-69d5-4fa8-a984-fba7a636dfe4', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 14000, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('2266decb-fa8f-4da3-8ebc-ad407a7fca71', 'DEMO-LENS-001', 'Cooke Anamorphic Prime Lenses (Set of 5)', 'طقم عدسات كوك أنامورفيك (5 عدسات)', 'Full-frame anamorphic lens set (32mm, 40mm, 50mm, 75mm, 100mm)', 'طقم عدسات سينمائية أنامورفيك كاملة الإطار', '46202273-9e02-42b2-885f-fd38c18e1ee0', 8500, 500, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || '2266decb-fa8f-4da3-8ebc-ad407a7fca71', '2266decb-fa8f-4da3-8ebc-ad407a7fca71', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || '2266decb-fa8f-4da3-8ebc-ad407a7fca71', '2266decb-fa8f-4da3-8ebc-ad407a7fca71', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 8500, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('dda790d9-5a97-440b-88fa-64997aba52e0', 'DEMO-LENS-002', 'ARRI Signature Prime Lens Set (18-125mm)', 'طقم عدسات آري سيجنتشر برايم', 'Full-frame large format cinema lens set', 'عدسات آري السينمائية للإطار الكامل', '46202273-9e02-42b2-885f-fd38c18e1ee0', 9500, 600, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'dda790d9-5a97-440b-88fa-64997aba52e0', 'dda790d9-5a97-440b-88fa-64997aba52e0', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'dda790d9-5a97-440b-88fa-64997aba52e0', 'dda790d9-5a97-440b-88fa-64997aba52e0', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 9500, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('a68d16e2-754f-450f-aa72-d66d2e49d037', 'DEMO-LIGHT-001', 'Aputure 1200d Pro Daylight LED Package', 'حزمة إضاءة أبتشر 1200d برو النهارية', 'High-output daylight LED fixture with F10 Fresnel', 'إضاءة LED فائقة القوة مع عدسة فرينل F10', '00fdc6d1-98ef-4d60-98e1-a62f0876d156', 2500, 150, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'a68d16e2-754f-450f-aa72-d66d2e49d037', 'a68d16e2-754f-450f-aa72-d66d2e49d037', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'a68d16e2-754f-450f-aa72-d66d2e49d037', 'a68d16e2-754f-450f-aa72-d66d2e49d037', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 2500, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('3e51a64d-f2a8-42c9-be18-b712d1f39cac', 'DEMO-LIGHT-002', 'Astera Titan Tube 8-Light Kit with Charging Case', 'طقم أنابيب إضاءة أستيرا تايتان (8 أنابيب)', 'Wireless pixel-controlled RGBMA LED tube lights', 'أنابيب إضاءة لاسلكية ذكية RGBMA', '00fdc6d1-98ef-4d60-98e1-a62f0876d156', 1800, 120, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || '3e51a64d-f2a8-42c9-be18-b712d1f39cac', '3e51a64d-f2a8-42c9-be18-b712d1f39cac', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || '3e51a64d-f2a8-42c9-be18-b712d1f39cac', '3e51a64d-f2a8-42c9-be18-b712d1f39cac', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 1800, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('15e07ada-1097-4bf8-bb66-43710b6c7f64', 'DEMO-GRIP-001', 'Freefly MōVI Pro Gimbal & Ring Package', 'نظام مانع الاهتزاز موفي برو للسينما', '3-axis motorized camera stabilizer with Mimic controller', 'مثبت كاميرا ثلاثي المحاور مع جهاز التحكم هواء', '00fdc6d1-98ef-4d60-98e1-a62f0876d156', 3200, 200, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || '15e07ada-1097-4bf8-bb66-43710b6c7f64', '15e07ada-1097-4bf8-bb66-43710b6c7f64', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || '15e07ada-1097-4bf8-bb66-43710b6c7f64', '15e07ada-1097-4bf8-bb66-43710b6c7f64', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 3200, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('e15e60e5-18bd-46f1-8e06-9895acdea115', 'DEMO-DRONE-001', 'DJI Inspire 3 8K Cinema Drone Package', 'طائرات درون سينمائية DJI Inspire 3 8K', 'Full-frame 8K ProRes RAW cinema drone system', 'نظام تصوير جوي سينمائي بدقة 8K ProRes RAW', '8ea0e0ca-6f8c-4279-81f6-0308a6a57fc1', 7500, 800, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'e15e60e5-18bd-46f1-8e06-9895acdea115', 'e15e60e5-18bd-46f1-8e06-9895acdea115', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'e15e60e5-18bd-46f1-8e06-9895acdea115', 'e15e60e5-18bd-46f1-8e06-9895acdea115', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 7500, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('4b21ac82-129a-4b1f-82f4-df553825df1a', 'DEMO-AUDIO-001', 'Sound Devices 888 16-Channel Audio Recorder', 'جهاز تسجيل الصوت السينمائي الميداني 16 قناة', '16-channel portable audio recorder & mixer with timecode', 'جهاز تسجيل ومزج صوت ميداني سينمائي مع تايم كود', 'e5fb322f-f5f5-43bc-8898-bc7187cc790f', 4200, 250, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || '4b21ac82-129a-4b1f-82f4-df553825df1a', '4b21ac82-129a-4b1f-82f4-df553825df1a', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || '4b21ac82-129a-4b1f-82f4-df553825df1a', '4b21ac82-129a-4b1f-82f4-df553825df1a', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 4200, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)
VALUES ('eac7476b-e7de-49a9-bc68-fb6640a1e956', 'DEMO-POST-001', 'DaVinci Resolve Studio Advanced Control Panel', 'لوحة التحكم المتقدمة دافينشي ريزولف', 'Hardware control surface for 8K HDR color grading', 'لوحة تحكم هاردوير للتلوين السينمائي 8K HDR', '20670350-e2ac-447c-8d46-72491e1828a4', 11000, 800, 'BHD', 0, true, true, 1, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)
VALUES ('sl-' || 'eac7476b-e7de-49a9-bc68-fb6640a1e956', 'eac7476b-e7de-49a9-bc68-fb6640a1e956', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)
VALUES ('sm-' || 'eac7476b-e7de-49a9-bc68-fb6640a1e956', 'eac7476b-e7de-49a9-bc68-fb6640a1e956', '9beb13e4-55d1-41bc-a1bd-e21ab0a3b1cf', 'initial', 4, 11000, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. COMMERCE & DELIVERY (Customers, Addresses, Coupons, Vehicles, Delivery Zones)
-- ----------------------------------------------------------------------------
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at) VALUES ('76edbd13-9ff8-414c-bd74-25e2849382a8', 'Sami', 'Saleh', 'sami.saleh@example.invalid', '+97317000404', 'active', now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default) VALUES ('addr-' || '76edbd13-9ff8-414c-bd74-25e2849382a8', '76edbd13-9ff8-414c-bd74-25e2849382a8', 'shipping', 'Primary Studio', 'Building 140, Road 2819', 'Floor 4, Suite 402', 'Seef District', 'Capital', '1012', 'BH', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at) VALUES ('7a03bf4b-99db-4d7f-97c0-4b72071c6a6b', 'Mona', 'Al-Khatib', 'mona.khatib@example.invalid', '+97339112233', 'active', now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default) VALUES ('addr-' || '7a03bf4b-99db-4d7f-97c0-4b72071c6a6b', '7a03bf4b-99db-4d7f-97c0-4b72071c6a6b', 'shipping', 'Primary Studio', 'Building 140, Road 2819', 'Floor 4, Suite 402', 'Seef District', 'Capital', '1012', 'BH', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO commerce.coupon (id, code, discount_type, discount_value, min_order_amount, is_active, starts_at, expires_at, created_at) VALUES
  ('cpn-001', 'RAMADAN2026', 'percentage', 15.00, 1000.000, true, now() - interval '10 days', now() + interval '60 days', now()),
  ('cpn-002', 'NEWGEAR100', 'fixed', 100.000, 1500.000, true, now() - interval '5 days', now() + interval '90 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.vehicle (id, plate, name, kind, notes, is_active, created_at, updated_at) VALUES ('1086bb44-da2e-4dee-b6af-766896063bb2', 'DEMO-1001', 'Grip & Lighting Unit Van', 'van', 'Production fleet unit', true, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO delivery.vehicle (id, plate, name, kind, notes, is_active, created_at, updated_at) VALUES ('1f739e28-7062-4f23-ad9a-6651415159ff', 'DEMO-1002', 'Camera & Audio Production Truck', 'truck', 'Production fleet unit', true, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO delivery.delivery_zone (id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES
  ('dz-01', 'Capital Governorate (Manama & Seef)', 'محافظة العاصمة (المنامة والسيف)', '{"Manama", "Seef", "Juffair"}', 5.000, 20.000, 100.000, true, 1, now(), now()),
  ('dz-02', 'Northern Governorate (Saar & Budaiya)', 'المحافظة الشمالية (سار والبديع)', '{"Saar", "Budaiya", "Janabiya"}', 7.000, 20.000, 150.000, true, 2, now(), now()),
  ('dz-03', 'Southern Governorate (Zallaq & Sakhir)', 'المحافظة الجنوبية (الزلاق والصخير)', '{"Zallaq", "Sakhir", "Riffa"}', 10.000, 30.000, 200.000, true, 3, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.delivery_slot (id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at) VALUES
  ('ds-01', 'dz-01', 1, '09:00', '13:00', 8, true, now()),
  ('ds-02', 'dz-01', 1, '14:00', '18:00', 8, true, now()),
  ('ds-03', 'dz-02', 2, '10:00', '15:00', 6, true, now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. WORKFLOW SERVICE (Tasks, Calendar Events, Letter Templates)
-- ----------------------------------------------------------------------------
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('21eec528-ff83-44bd-9b7f-4945b1ed7ec9', 'Prepare demo production equipment call-sheet', 'Verify ARRI Alexa 35 sensor calibration and Cooke Anamorphic lens package.', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', (CURRENT_DATE + INTERVAL '5 days')::date, 'high', 'in_progress', 'deal', '969985f6-0f01-46b0-b249-5a2dc9a4c302', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('179986be-c944-48b9-b0a4-2cbb575a1be5', 'Color grading & HDR master export', 'DaVinci Resolve Studio color pass for Gulfwave 5G commercial reel.', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', (CURRENT_DATE + INTERVAL '5 days')::date, 'high', 'in_progress', 'deal', '969985f6-0f01-46b0-b249-5a2dc9a4c302', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('2e2f0407-09c2-453f-ac21-4ce565aaf744', 'Location Recce & Power Load Audit at Marassi', 'Inspect power distribution and camera positioning angles for Marassi shoot.', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', (CURRENT_DATE + INTERVAL '5 days')::date, 'medium', 'in_progress', 'deal', '969985f6-0f01-46b0-b249-5a2dc9a4c302', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('14e37c26-7c9f-4a1f-b2a6-017100a89836', 'Submit Filming Permit Application to IAA', 'Submit location details and crew passport IDs to Ministry of Information Affairs.', '04c696d7-f5e1-408c-8723-205b567d6119', (CURRENT_DATE + INTERVAL '5 days')::date, 'high', 'in_progress', 'deal', '969985f6-0f01-46b0-b249-5a2dc9a4c302', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)
VALUES ('d76b192a-a3b8-4dc3-bc4c-ec943e48b462', 'Pre-Production Equipment Checkout & Test Shots', 'Assemble Alexa 35 rig, test wireless video transmitters and Astera tube sync.', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', (CURRENT_DATE + INTERVAL '5 days')::date, 'medium', 'in_progress', 'deal', '969985f6-0f01-46b0-b249-5a2dc9a4c302', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('44ecdd69-53e3-4f43-9a05-6240ec1b61ba', 'Gulfwave 5G Commercial Principal Photography', 'Location shoot at Bahrain Bay with Alexa 35 package.', now() + interval '2 days', now() + interval '2 days 4 hours', '8e70e1a0-9cdb-4b70-8b0a-70da5ee5b744', 'production', 'Bahrain Bay Promenade', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('fa9e68fe-194d-4d45-8471-98262903a8ec', 'Pre-Production Technical Meeting with Client', 'Review storyboard, shot list and lighting setup at Seef Studio Soundstage.', now() + interval '2 days', now() + interval '2 days 4 hours', '52f3083b-d0eb-41ac-8f20-3b6c7f0d7a75', 'meeting', 'Seef Studio Soundstage', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)
VALUES ('c2b97db0-9f8f-43a6-b935-3171c318de82', 'Final Color Suite Screening with Director & Client', 'DaVinci Resolve HDR 4K screening in Post-Production Suite 1.', now() + interval '2 days', now() + interval '2 days 4 hours', 'c1947ad8-900f-419f-a0e2-3f2afe3d1bda', 'screening', 'Post-Production Suite 1', false, now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO workflow.letter_template (id, name_en, name_ar, template_body, sort_order) VALUES
  ('lt-01', 'Employment & Salary Certificate', 'شهادة راتب وعمل', 'This is to certify that {{employee_name}} is employed at {{company_name}} with monthly salary {{salary}}.', 1),
  ('lt-02', 'Quotation Official Cover Letter', 'خطاب تقديم عرض أسعار', 'We are pleased to submit our commercial quotation {{quotation_number}} for your review.', 2)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. CMS SERVICE (Pages, Articles, FAQs, Statistics, Reviews, Content Snapshot)
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
VALUES ('b45b8577-6564-4ee3-b02f-03e94b127428', 'story-1', 'Behind the Scenes: Gulfwave 5G Anamorphic Campaign', 'خلف الكواليس: حملة ألترا 5G الأنامورفية', 'Behind-the-scenes look at filming with ARRI Alexa 35 and Cooke Anamorphic lenses at Bahrain Bay.', 'نظرة على كواليس التصوير بكاميرات آري وعدسات أنامورفيك في خليج البحرين.', 'case-study', '{"production","cinema","tech"}', 'Editorial Team', 'published', true, now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)
VALUES ('87df8568-e6b5-4306-a11a-013eff76d29e', 'story-2', 'Documenting Bahrain''s Heritage in 8K RAW', 'توثيق تراث البحرين بدقة 8K RAW', 'Behind the 8K RAW aerial and ground production for Exhibition World Bahrain.', 'كيف تم إنتاج الفيلم التوثيقي لمركز المعارض بدقة 8K RAW.', 'technology', '{"production","cinema","tech"}', 'Editorial Team', 'published', false, now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)
VALUES ('86279b56-65df-427d-966a-da7806da2515', 'story-3', 'Mastering HDR Color Grading in DaVinci Resolve Studio', 'إتقان التلوين السينمائي HDR في دافينشي ريزولف', 'Technical breakdown of our post-production color pipeline.', 'تفاصيل استراتيجية التلوين السينمائي الرقمي لإصدارات HDR.', 'case-study', '{"production","cinema","tech"}', 'Editorial Team', 'published', false, now(), now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)
VALUES ('459c1380-0b64-4048-a6ef-29db82b3318b', 'story-4', 'Next-Gen Aerial Drone Cinematography Workflows', 'تقنيات التصوير الجوي السينمائي بالدرون', 'How heavy-lifter drones and 8K sensors transform commercial filming.', 'كيف تسهم طائرات الدرون مع مستشعرات 8K في الارتقاء بالإعلانات التجارية.', 'technology', '{"production","cinema","tech"}', 'Editorial Team', 'published', false, now(), now(), now())
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

INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at) VALUES
  ('70da75a0-0445-4b10-ad20-a6366b6a0ad1', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'infrastructure', 'storage', 'high', 'in_progress', 'High-Speed NAS Storage Volume Expansion', 'Post-production NAS storage at 92% capacity for 8K RAW footage intake.', 'NAS-VOL-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', now() + interval '2 hours', now() + interval '24 hours', now() - interval '1 hour', NULL, now() - interval '2 days', now()),
  ('70da75a0-0445-4b10-ad20-a6366b6a0ad2', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'hardware', 'calibration', 'medium', 'resolved', 'DaVinci Resolve HDR Reference Monitor Calibration', 'Quarterly calibration completed for Sony BVM-HX310 reference monitor.', 'MON-HDR-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', now() - interval '9 days', now() - interval '7 days', now() - interval '9 days', now() - interval '8 days', now() - interval '10 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at) VALUES
  ('80da75a0-0445-4b10-ad20-a6366b6a0ad1', '70da75a0-0445-4b10-ad20-a6366b6a0ad1', 'staff', 'super-admin', 'created', NULL, 'in_progress', '{"message": "Ticket created via system"}'::jsonb, now() - interval '2 days'),
  ('80da75a0-0445-4b10-ad20-a6366b6a0ad2', '70da75a0-0445-4b10-ad20-a6366b6a0ad2', 'it', '430c4105-6360-4415-bf1b-087d582c7fc6', 'status_change', 'in_progress', 'resolved', '{"message": "Colorimeter calibration certified"}'::jsonb, now() - interval '8 days')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 13. NOTIFY SERVICE (Preferences & Notification Feed)
-- ----------------------------------------------------------------------------
INSERT INTO notify.notification (id, realm, recipient, category, priority, title, body, caller, silent, deliver_at, created_at) VALUES
  ('90da75a0-0445-4b10-ad20-a6366b6a0ad1', 'staff', 'super-admin', 'finance', 'high', 'Invoice Payment Received', 'Payment of 11,880 BHD received for Exhibition World Inauguration Film.', 'finance-svc', false, now() - interval '1 hour', now() - interval '1 hour'),
  ('90da75a0-0445-4b10-ad20-a6366b6a0ad2', 'staff', 'super-admin', 'inventory', 'normal', 'Equipment Check-in Complete', 'ARRI Alexa 35 package safely checked back into Main Equipment Vault.', 'inventory-svc', false, now() - interval '4 hours', now() - interval '4 hours')
ON CONFLICT (id) DO NOTHING;

COMMIT;
-- End of SQL Seed