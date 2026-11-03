-- Company assets issued to staff: categories with spec fields and checklists, assets, and signed, approved handovers.
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "specFields" JSONB NOT NULL DEFAULT '[]',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetCategory_code_key" ON "AssetCategory" ("code");

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" DATE,
    "purchaseCost" DECIMAL(12, 3),
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "supplier" TEXT,
    "invoiceReference" TEXT,
    "warrantyUntil" DATE,
    "condition" TEXT NOT NULL DEFAULT 'good',
    "status" TEXT NOT NULL DEFAULT 'available',
    "specs" JSONB NOT NULL DEFAULT '{}',
    "location" TEXT,
    "holderEmployeeId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_holderEmployeeId_fkey" FOREIGN KEY ("holderEmployeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_condition_check" CHECK (
        "condition" IN (
            'new',
            'excellent',
            'good',
            'fair',
            'poor',
            'damaged'
        )
    ),
    CONSTRAINT "Asset_status_check" CHECK (
        "status" IN (
            'available',
            'assigned',
            'maintenance',
            'lost',
            'retired'
        )
    ),
    CONSTRAINT "Asset_holder_check" CHECK (
        ("status" = 'assigned') = (
            "holderEmployeeId" IS NOT NULL
        )
    ),
    CONSTRAINT "Asset_cost_check" CHECK (
        "purchaseCost" IS NULL
        OR "purchaseCost" >= 0
    )
);

CREATE UNIQUE INDEX "Asset_assetTag_key" ON "Asset" ("assetTag");

CREATE INDEX "Asset_categoryId_idx" ON "Asset" ("categoryId");

CREATE INDEX "Asset_status_idx" ON "Asset" ("status");

CREATE INDEX "Asset_holderEmployeeId_idx" ON "Asset" ("holderEmployeeId");

CREATE UNIQUE INDEX "Asset_serial_per_category" ON "Asset" ("categoryId", "serialNumber")
WHERE
    "serialNumber" IS NOT NULL;

CREATE TABLE "AssetHandover" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting_employee',
    "handoverDate" DATE NOT NULL,
    "condition" TEXT NOT NULL,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "specsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "accessories" TEXT,
    "damageNotes" TEXT,
    "damageCharge" DECIMAL(12, 3),
    "deductFromSalary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "offboardingId" TEXT,
    "createdById" TEXT NOT NULL,
    "creatorSignatureUrl" TEXT,
    "employeeSignature" TEXT,
    "employeeSignerName" TEXT,
    "employeeSignedAt" TIMESTAMP(3),
    "signedInPerson" BOOLEAN NOT NULL DEFAULT false,
    "decidedAt" TIMESTAMP(3),
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetHandover_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AssetHandover_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetHandover_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetHandover_kind_check" CHECK ("kind" IN ('issue', 'return')),
    CONSTRAINT "AssetHandover_status_check" CHECK (
        "status" IN (
            'awaiting_employee',
            'pending_approval',
            'completed',
            'rejected',
            'cancelled'
        )
    ),
    CONSTRAINT "AssetHandover_signed_check" CHECK (
        "status" IN (
            'awaiting_employee',
            'cancelled'
        )
        OR "employeeSignedAt" IS NOT NULL
    ),
    CONSTRAINT "AssetHandover_charge_check" CHECK (
        "damageCharge" IS NULL
        OR "damageCharge" >= 0
    )
);

CREATE UNIQUE INDEX "AssetHandover_reference_key" ON "AssetHandover" ("reference");

CREATE INDEX "AssetHandover_assetId_idx" ON "AssetHandover" ("assetId");

CREATE INDEX "AssetHandover_employeeId_idx" ON "AssetHandover" ("employeeId");

CREATE INDEX "AssetHandover_status_idx" ON "AssetHandover" ("status");
-- One open handover per asset at a time.
CREATE UNIQUE INDEX "AssetHandover_one_open" ON "AssetHandover" ("assetId")
WHERE
    "status" IN (
        'awaiting_employee',
        'pending_approval'
    );

INSERT INTO "AssetCategory" ("id", "code", "nameEn", "nameAr", "specFields", "checklist", "displayOrder", "updatedAt") VALUES
(gen_random_uuid()::text, 'laptop', 'Laptop', 'حاسوب محمول', '[{"key": "cpu", "labelEn": "Processor", "labelAr": "المعالج", "type": "text"}, {"key": "ram_gb", "labelEn": "Memory (GB)", "labelAr": "الذاكرة (جيجابايت)", "type": "number"}, {"key": "storage_gb", "labelEn": "Storage (GB)", "labelAr": "التخزين (جيجابايت)", "type": "number"}, {"key": "os", "labelEn": "Operating system", "labelAr": "نظام التشغيل", "type": "text"}]'::jsonb, '[{"key": "charger", "labelEn": "Charger", "labelAr": "الشاحن"}, {"key": "screen", "labelEn": "Screen free of scratches and dead pixels", "labelAr": "الشاشة خالية من الخدوش والبكسلات الميتة"}, {"key": "keyboard", "labelEn": "Keyboard and trackpad work", "labelAr": "لوحة المفاتيح ولوحة اللمس تعملان"}, {"key": "battery", "labelEn": "Battery holds charge", "labelAr": "البطارية تحتفظ بالشحن"}, {"key": "body", "labelEn": "Body free of dents", "labelAr": "الهيكل خالٍ من الصدمات"}, {"key": "data", "labelEn": "Work data backed up and personal accounts removed", "labelAr": "نسخ بيانات العمل احتياطيًا وإزالة الحسابات الشخصية"}]'::jsonb, 0, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'camera', 'Camera', 'كاميرا', '[{"key": "sensor", "labelEn": "Sensor", "labelAr": "المستشعر", "type": "text"}, {"key": "mount", "labelEn": "Lens mount", "labelAr": "حامل العدسة", "type": "text"}, {"key": "shutter_count", "labelEn": "Shutter count", "labelAr": "عدد مرات الغالق", "type": "number"}, {"key": "firmware", "labelEn": "Firmware", "labelAr": "البرنامج الثابت", "type": "text"}]'::jsonb, '[{"key": "body", "labelEn": "Body free of dents and scratches", "labelAr": "الهيكل خالٍ من الصدمات والخدوش"}, {"key": "sensor", "labelEn": "Sensor clean", "labelAr": "المستشعر نظيف"}, {"key": "screen", "labelEn": "Screen and viewfinder OK", "labelAr": "الشاشة ومحدد المنظر سليمان"}, {"key": "batteries", "labelEn": "Batteries", "labelAr": "البطاريات"}, {"key": "charger", "labelEn": "Charger", "labelAr": "الشاحن"}, {"key": "body_cap", "labelEn": "Body cap", "labelAr": "غطاء الهيكل"}, {"key": "strap", "labelEn": "Strap", "labelAr": "الحزام"}, {"key": "card_slots", "labelEn": "Card slots work", "labelAr": "منافذ البطاقات تعمل"}, {"key": "shutter_recorded", "labelEn": "Shutter count recorded", "labelAr": "تسجيل عدد مرات الغالق"}]'::jsonb, 1, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'lens', 'Lens', 'عدسة', '[{"key": "mount", "labelEn": "Mount", "labelAr": "الحامل", "type": "text"}, {"key": "focal_length", "labelEn": "Focal length", "labelAr": "البعد البؤري", "type": "text"}, {"key": "aperture", "labelEn": "Maximum aperture", "labelAr": "أقصى فتحة", "type": "text"}, {"key": "filter_size", "labelEn": "Filter size (mm)", "labelAr": "قطر الفلتر (مم)", "type": "number"}]'::jsonb, '[{"key": "front_cap", "labelEn": "Front cap", "labelAr": "الغطاء الأمامي"}, {"key": "rear_cap", "labelEn": "Rear cap", "labelAr": "الغطاء الخلفي"}, {"key": "hood", "labelEn": "Lens hood", "labelAr": "غطاء الحماية من الضوء"}, {"key": "glass", "labelEn": "Glass clean, no scratches or fungus", "labelAr": "الزجاج نظيف بلا خدوش أو فطريات"}, {"key": "focus", "labelEn": "Focus and zoom rings smooth", "labelAr": "حلقات التركيز والتقريب سلسة"}, {"key": "aperture", "labelEn": "Aperture works", "labelAr": "الفتحة تعمل"}]'::jsonb, 2, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'memory_card', 'Memory card', 'بطاقة ذاكرة', '[{"key": "capacity_gb", "labelEn": "Capacity (GB)", "labelAr": "السعة (جيجابايت)", "type": "number"}, {"key": "type", "labelEn": "Type (SD, CFexpress…)", "labelAr": "النوع", "type": "text"}, {"key": "speed", "labelEn": "Speed class", "labelAr": "فئة السرعة", "type": "text"}]'::jsonb, '[{"key": "case", "labelEn": "Case", "labelAr": "العلبة"}, {"key": "formatted", "labelEn": "Formatted and data handed over", "labelAr": "تمت التهيئة وتسليم البيانات"}, {"key": "no_damage", "labelEn": "No physical damage", "labelAr": "لا يوجد ضرر مادي"}]'::jsonb, 3, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'phone', 'Mobile phone', 'هاتف محمول', '[{"key": "imei", "labelEn": "IMEI", "labelAr": "الرقم التسلسلي IMEI", "type": "text"}, {"key": "phone_number", "labelEn": "Line number", "labelAr": "رقم الخط", "type": "text"}, {"key": "storage_gb", "labelEn": "Storage (GB)", "labelAr": "التخزين (جيجابايت)", "type": "number"}]'::jsonb, '[{"key": "charger", "labelEn": "Charger", "labelAr": "الشاحن"}, {"key": "case", "labelEn": "Case and screen protector", "labelAr": "الغطاء وواقي الشاشة"}, {"key": "screen", "labelEn": "Screen free of cracks", "labelAr": "الشاشة خالية من الكسور"}, {"key": "sim", "labelEn": "SIM card", "labelAr": "شريحة الاتصال"}, {"key": "accounts", "labelEn": "Personal accounts signed out", "labelAr": "تسجيل الخروج من الحسابات الشخصية"}]'::jsonb, 4, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'vehicle', 'Vehicle', 'مركبة', '[{"key": "plate_number", "labelEn": "Plate number", "labelAr": "رقم اللوحة", "type": "text"}, {"key": "chassis_number", "labelEn": "Chassis number", "labelAr": "رقم الهيكل", "type": "text"}, {"key": "year", "labelEn": "Model year", "labelAr": "سنة الصنع", "type": "number"}, {"key": "color", "labelEn": "Color", "labelAr": "اللون", "type": "text"}, {"key": "mileage", "labelEn": "Mileage (km)", "labelAr": "المسافة المقطوعة (كم)", "type": "number"}, {"key": "registration_until", "labelEn": "Registration valid until", "labelAr": "الملكية سارية حتى", "type": "date"}, {"key": "insurance_until", "labelEn": "Insurance valid until", "labelAr": "التأمين ساري حتى", "type": "date"}]'::jsonb, '[{"key": "registration", "labelEn": "Registration card", "labelAr": "بطاقة الملكية"}, {"key": "insurance", "labelEn": "Insurance card", "labelAr": "بطاقة التأمين"}, {"key": "spare_tire", "labelEn": "Spare tire and jack", "labelAr": "الإطار الاحتياطي والرافعة"}, {"key": "exterior", "labelEn": "Exterior free of damage", "labelAr": "الهيكل الخارجي خالٍ من الأضرار"}, {"key": "interior", "labelEn": "Interior clean", "labelAr": "المقصورة نظيفة"}, {"key": "fuel", "labelEn": "Fuel level recorded", "labelAr": "تسجيل مستوى الوقود"}, {"key": "mileage", "labelEn": "Mileage recorded", "labelAr": "تسجيل المسافة المقطوعة"}, {"key": "keys", "labelEn": "All keys", "labelAr": "جميع المفاتيح"}]'::jsonb, 5, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'drone', 'Drone', 'طائرة مسيّرة', '[{"key": "registration_number", "labelEn": "Registration number", "labelAr": "رقم التسجيل", "type": "text"}, {"key": "flight_hours", "labelEn": "Flight hours", "labelAr": "ساعات الطيران", "type": "number"}]'::jsonb, '[{"key": "batteries", "labelEn": "Batteries", "labelAr": "البطاريات"}, {"key": "propellers", "labelEn": "Spare propellers", "labelAr": "المراوح الاحتياطية"}, {"key": "controller", "labelEn": "Controller", "labelAr": "وحدة التحكم"}, {"key": "case", "labelEn": "Case", "labelAr": "الحقيبة"}, {"key": "gimbal", "labelEn": "Gimbal and camera work", "labelAr": "المثبت والكاميرا يعملان"}]'::jsonb, 6, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'lighting', 'Lighting', 'إضاءة', '[{"key": "power_w", "labelEn": "Power (W)", "labelAr": "القدرة (واط)", "type": "number"}, {"key": "mount", "labelEn": "Mount", "labelAr": "الحامل", "type": "text"}]'::jsonb, '[{"key": "bulb", "labelEn": "Light works", "labelAr": "الإضاءة تعمل"}, {"key": "cables", "labelEn": "Power cables", "labelAr": "كابلات الطاقة"}, {"key": "stand", "labelEn": "Stand", "labelAr": "الحامل"}, {"key": "modifiers", "labelEn": "Modifiers (softbox, barn doors)", "labelAr": "الملحقات"}]'::jsonb, 7, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'audio', 'Audio', 'صوتيات', '[{"key": "type", "labelEn": "Type", "labelAr": "النوع", "type": "text"}]'::jsonb, '[{"key": "works", "labelEn": "Records cleanly", "labelAr": "يسجل بوضوح"}, {"key": "cables", "labelEn": "Cables", "labelAr": "الكابلات"}, {"key": "windscreen", "labelEn": "Windscreen", "labelAr": "واقي الرياح"}, {"key": "batteries", "labelEn": "Batteries", "labelAr": "البطاريات"}]'::jsonb, 8, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'tablet', 'Tablet', 'جهاز لوحي', '[{"key": "storage_gb", "labelEn": "Storage (GB)", "labelAr": "التخزين (جيجابايت)", "type": "number"}]'::jsonb, '[{"key": "charger", "labelEn": "Charger", "labelAr": "الشاحن"}, {"key": "screen", "labelEn": "Screen free of cracks", "labelAr": "الشاشة خالية من الكسور"}, {"key": "accounts", "labelEn": "Personal accounts signed out", "labelAr": "تسجيل الخروج من الحسابات الشخصية"}]'::jsonb, 9, CURRENT_TIMESTAMP),
(gen_random_uuid()::text, 'other', 'Other', 'أخرى', '[]'::jsonb, '[{"key": "condition", "labelEn": "Condition as described", "labelAr": "الحالة كما هو موصوف"}]'::jsonb, 10, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Permissions: admins manage assets; finance approves and reports; production and producers keep the gear.
INSERT INTO "Permission" ("id", "role", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, r."id", 'assets', a."action",
  r."id" = 'super_admin'
  OR (r."id" = 'admin' AND a."action" IN ('read', 'write', 'create', 'edit', 'delete', 'export', 'approve'))
  OR (r."id" = 'finance_manager' AND a."action" IN ('read', 'export', 'approve'))
  OR (r."id" = 'accountant' AND a."action" IN ('read'))
  OR (r."id" = 'production_manager' AND a."action" IN ('read', 'write', 'create', 'edit'))
FROM "Role" r
CROSS JOIN (VALUES ('read'), ('write'), ('delete'), ('export'), ('approve'), ('create'), ('edit'), ('assign'), ('issue_send'), ('manage_permissions'), ('reset_credentials')) AS a("action")
ON CONFLICT ("role", "resource", "action") DO NOTHING;

-- Handovers are approved by the employee's line manager, then HR, then finance (editable in Settings → Approvals).
INSERT INTO "ApprovalPolicy" ("id", "targetType", "enabled", "allowSelfApproval", "autoApproveRoles", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'asset_handover', true, false, ARRAY['super_admin'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("targetType") DO NOTHING;

INSERT INTO "ApprovalPolicyStep" ("id", "policyId", "order", "approverMode", "permission")
SELECT gen_random_uuid()::text, p."id", s."order", s."mode", s."permission"
FROM "ApprovalPolicy" p
CROSS JOIN (VALUES (1, 'manager', NULL), (2, 'permission', 'employees:approve'), (3, 'permission', 'assets:approve')) AS s("order", "mode", "permission")
WHERE p."targetType" = 'asset_handover'
ON CONFLICT ("policyId", "order") DO NOTHING;