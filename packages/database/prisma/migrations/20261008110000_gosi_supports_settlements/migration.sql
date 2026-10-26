-- Social insurance (GOSI/SIO) contributions as dated components, wage-support programmes such as Tamkeen with
-- per-employee enrolments, and final settlements when an employee leaves.

-- ---------------------------------------------------------------- GOSI
CREATE TABLE "GosiSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    -- Contributions follow the insured month: due in full for a month the employee is employed on its 1st day,
    -- and not due for a month they join after the 1st.
    "firstOfMonthRule" BOOLEAN NOT NULL DEFAULT true,
    -- "contract": contributions on the pay in the employment record; "registered": on the wage registered with GOSI when set.
    "wageSource" TEXT NOT NULL DEFAULT 'registered',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GosiSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GosiSettings_wageSource_check" CHECK (
        "wageSource" IN ('contract', 'registered')
    )
);

INSERT INTO
    "GosiSettings" ("id")
VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE "GosiComponent" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "appliesTo" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "employeePercent" DECIMAL(6,3) NOT NULL DEFAULT 0,
  "employerPercent" DECIMAL(6,3) NOT NULL DEFAULT 0,
  -- [{ "fromYears": 3, "employeePercent": 0, "employerPercent": 8.4 }]: rates by completed years of service.
  "serviceTiers" JSONB NOT NULL DEFAULT '[]',
  "wageBasis" TEXT NOT NULL DEFAULT 'fixed',
  "minWage" DECIMAL(12,3),
  "maxWage" DECIMAL(12,3),
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GosiComponent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GosiComponent_wageBasis_check" CHECK ("wageBasis" IN ('basic', 'basic_housing', 'fixed')),
  CONSTRAINT "GosiComponent_percent_check" CHECK ("employeePercent" >= 0 AND "employeePercent" <= 100 AND "employerPercent" >= 0 AND "employerPercent" <= 100),
  CONSTRAINT "GosiComponent_dates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom"),
  CONSTRAINT "GosiComponent_wage_check" CHECK ("maxWage" IS NULL OR "minWage" IS NULL OR "maxWage" >= "minWage")
);

CREATE INDEX "GosiComponent_code_effectiveFrom_idx" ON "GosiComponent" ("code", "effectiveFrom");

-- Bahrain SIO rates in force from March 2024 (edit or schedule changes in HR → Social insurance).
INSERT INTO "GosiComponent" ("id", "code", "nameEn", "nameAr", "appliesTo", "employeePercent", "employerPercent", "serviceTiers", "wageBasis", "maxWage", "effectiveFrom", "notes") VALUES
  (gen_random_uuid()::text, 'pension', 'Pension (old age, disability and death)', 'التقاعد (الشيخوخة والعجز والوفاة)', ARRAY['bahraini', 'gcc'], 7, 12, '[]', 'fixed', 4000, '2024-03-01', 'Bahraini and GCC nationals.'),
  (gen_random_uuid()::text, 'unemployment', 'Unemployment insurance', 'التأمين ضد التعطل', ARRAY['bahraini', 'gcc', 'expat'], 1, 1, '[]', 'fixed', 4000, '2024-03-01', NULL),
  (gen_random_uuid()::text, 'hazards', 'Occupational hazards', 'إصابات العمل', ARRAY['bahraini', 'gcc', 'expat'], 0, 3, '[]', 'fixed', 4000, '2024-03-01', NULL),
  (gen_random_uuid()::text, 'end_of_service', 'End-of-service benefit (expatriates)', 'مكافأة نهاية الخدمة (غير البحرينيين)', ARRAY['expat'], 0, 4.2, '[{"fromYears": 3, "employeePercent": 0, "employerPercent": 8.4}]', 'fixed', NULL, '2024-03-01', 'Paid to SIO instead of a leaving indemnity: 4.2% for the first three years of service, 8.4% after.');

CREATE TABLE "EmployeeGosiRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    -- "bahraini" | "gcc" | "expat" | "exempt"
    "category" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "registeredWage" DECIMAL(12, 3),
    -- [{ "code": "pension", "employeePercent": 6, "employerPercent": 12, "exempt": false }]
    "overrides" JSONB NOT NULL DEFAULT '[]',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeGosiRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmployeeGosiRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeGosiRecord_category_check" CHECK (
        "category" IN (
            'bahraini',
            'gcc',
            'expat',
            'exempt'
        )
    ),
    CONSTRAINT "EmployeeGosiRecord_dates_check" CHECK (
        "effectiveTo" IS NULL
        OR "effectiveTo" >= "effectiveFrom"
    ),
    CONSTRAINT "EmployeeGosiRecord_wage_check" CHECK (
        "registeredWage" IS NULL
        OR "registeredWage" >= 0
    )
);

CREATE INDEX "EmployeeGosiRecord_employeeId_effectiveFrom_idx" ON "EmployeeGosiRecord" ("employeeId", "effectiveFrom");

-- ---------------------------------------------------------------- Wage-support programmes
CREATE TABLE "SupportProgram" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "claimPeriodMonths" INTEGER NOT NULL DEFAULT 6,
    -- Support for a month the employee is paid only part of follows the share of the month paid.
    "prorate" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportProgram_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportProgram_claim_check" CHECK (
        "claimPeriodMonths" BETWEEN 1 AND 24
    )
);

CREATE UNIQUE INDEX "SupportProgram_code_key" ON "SupportProgram" ("code");

CREATE TABLE "SupportProgramRule" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "wageBasis" TEXT NOT NULL DEFAULT 'fixed',
    -- [{ "year": 1, "percent": 70 }, { "year": 2, "percent": 50 }, { "year": 3, "percent": 30 }]
    "schedule" JSONB NOT NULL DEFAULT '[]',
    "wageCap" DECIMAL(12, 3),
    "monthlyCap" DECIMAL(12, 3),
    -- [{ "qualification": "bachelor", "cap": 800 }]
    "qualificationCaps" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportProgramRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportProgramRule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "SupportProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupportProgramRule_wageBasis_check" CHECK (
        "wageBasis" IN (
            'basic',
            'basic_housing',
            'fixed'
        )
    ),
    CONSTRAINT "SupportProgramRule_dates_check" CHECK (
        "effectiveTo" IS NULL
        OR "effectiveTo" >= "effectiveFrom"
    )
);

CREATE INDEX "SupportProgramRule_programId_effectiveFrom_idx" ON "SupportProgramRule" ("programId", "effectiveFrom");

INSERT INTO "SupportProgram" ("id", "code", "nameEn", "nameAr", "provider", "claimPeriodMonths", "notes") VALUES
  (gen_random_uuid()::text, 'tamkeen_wage', 'Tamkeen wage support', 'دعم الأجور من تمكين', 'Tamkeen', 6, 'Share of a Bahraini hire''s wage for three years, claimed every six months.')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "SupportProgramRule" ("id", "programId", "effectiveFrom", "wageBasis", "schedule", "monthlyCap", "qualificationCaps", "notes")
SELECT gen_random_uuid()::text, p."id", '2024-01-01', 'fixed', '[{"year": 1, "percent": 70}, {"year": 2, "percent": 50}, {"year": 3, "percent": 30}]', 800,
  '[{"qualification": "secondary", "cap": 400}, {"qualification": "diploma", "cap": 600}, {"qualification": "bachelor", "cap": 800}, {"qualification": "master", "cap": 800}, {"qualification": "doctorate", "cap": 800}]',
  'Check the current terms with Tamkeen; schedule a new rule when they change.'
FROM "SupportProgram" p WHERE p."code" = 'tamkeen_wage';

CREATE TABLE "EmployeeSupport" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    -- applied | approved | partially_approved | rejected | suspended | ended
    "status" TEXT NOT NULL DEFAULT 'applied',
    "qualification" TEXT,
    "applicationRef" TEXT,
    "appliedOn" DATE,
    "decidedOn" DATE,
    "startMonth" TEXT NOT NULL,
    "endMonth" TEXT,
    -- Partial approvals: the share approved instead of the programme schedule, or a fixed monthly amount.
    "approvedPercent" DECIMAL(5, 2),
    "approvedAmount" DECIMAL(12, 3),
    "monthlyCap" DECIMAL(12, 3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeSupport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmployeeSupport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeSupport_programId_fkey" FOREIGN KEY ("programId") REFERENCES "SupportProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmployeeSupport_status_check" CHECK (
        "status" IN (
            'applied',
            'approved',
            'partially_approved',
            'rejected',
            'suspended',
            'ended'
        )
    ),
    CONSTRAINT "EmployeeSupport_months_check" CHECK (
        "startMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$'
        AND (
            "endMonth" IS NULL
            OR (
                "endMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$'
                AND "endMonth" >= "startMonth"
            )
        )
    ),
    CONSTRAINT "EmployeeSupport_amounts_check" CHECK (
        (
            "approvedPercent" IS NULL
            OR "approvedPercent" BETWEEN 0 AND 100
        )
        AND (
            "approvedAmount" IS NULL
            OR "approvedAmount" >= 0
        )
        AND (
            "monthlyCap" IS NULL
            OR "monthlyCap" >= 0
        )
    )
);

CREATE INDEX "EmployeeSupport_employeeId_idx" ON "EmployeeSupport" ("employeeId");

CREATE INDEX "EmployeeSupport_programId_status_idx" ON "EmployeeSupport" ("programId", "status");

CREATE TABLE "EmployeeSupportEvent" (
    "id" TEXT NOT NULL,
    "supportId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeSupportEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmployeeSupportEvent_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "EmployeeSupport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmployeeSupportEvent_supportId_createdAt_idx" ON "EmployeeSupportEvent" ("supportId", "createdAt");

-- ---------------------------------------------------------------- Final settlements
CREATE TABLE "FinalSettlement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "handoverId" TEXT,
    -- resignation | termination | end_of_contract | retirement | death | other
    "reason" TEXT NOT NULL,
    "lastWorkingDay" DATE NOT NULL,
    -- draft | submitted | approved | rejected | paid | cancelled
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "totalAdditions" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "employerContributions" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    -- Everything the figures were worked out from (pay, balances, service, rules), frozen at each calculation.
    "calculation" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "employeeSignature" TEXT,
    "employeeSignerName" TEXT,
    "employeeSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalSettlement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinalSettlement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinalSettlement_status_check" CHECK (
        "status" IN (
            'draft',
            'submitted',
            'approved',
            'rejected',
            'paid',
            'cancelled'
        )
    ),
    CONSTRAINT "FinalSettlement_reason_check" CHECK (
        "reason" IN (
            'resignation',
            'termination',
            'end_of_contract',
            'retirement',
            'death',
            'other'
        )
    )
);

CREATE UNIQUE INDEX "FinalSettlement_reference_key" ON "FinalSettlement" ("reference");

CREATE INDEX "FinalSettlement_employeeId_idx" ON "FinalSettlement" ("employeeId");

CREATE INDEX "FinalSettlement_status_idx" ON "FinalSettlement" ("status");
-- One open settlement per employee.
CREATE UNIQUE INDEX "FinalSettlement_one_open" ON "FinalSettlement" ("employeeId")
WHERE
    "status" IN (
        'draft',
        'submitted',
        'approved'
    );

CREATE TABLE "FinalSettlementLine" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "amount" DECIMAL(12, 3) NOT NULL,
    -- "auto" lines are recalculated; "manual" lines are kept.
    "source" TEXT NOT NULL DEFAULT 'auto',
    "details" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FinalSettlementLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinalSettlementLine_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "FinalSettlement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinalSettlementLine_kind_check" CHECK (
        "kind" IN ('addition', 'deduction')
    ),
    CONSTRAINT "FinalSettlementLine_source_check" CHECK (
        "source" IN ('auto', 'manual')
    ),
    CONSTRAINT "FinalSettlementLine_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX "FinalSettlementLine_settlementId_idx" ON "FinalSettlementLine" ("settlementId");

-- Leaving indemnity rules for staff not covered by the SIO end-of-service scheme, editable in HR settings.
ALTER TABLE "HrPolicy"
ADD COLUMN "gratuityRules" JSONB NOT NULL DEFAULT '{"enabled": true, "appliesTo": ["expat"], "wageBasis": "basic", "firstYears": 3, "firstYearsMonths": 0.5, "laterYearsMonths": 1, "minServiceMonths": 12, "serviceUntil": "2024-02-29"}';
-- Unused annual leave is paid out on leaving at the daily rate of this pay.
ALTER TABLE "HrPolicy"
ADD COLUMN "leaveEncashmentBase" TEXT NOT NULL DEFAULT 'fixed';

-- Final settlements are approved by the employee's manager, HR and finance by default.
INSERT INTO "ApprovalPolicy" ("id", "targetType", "enabled", "allowSelfApproval", "autoApproveRoles", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'final_settlement', true, false, ARRAY['super_admin'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("targetType") DO NOTHING;

INSERT INTO "ApprovalPolicyStep" ("id", "policyId", "order", "approverMode", "permission")
SELECT gen_random_uuid()::text, p."id", s."order", s."mode", s."permission"
FROM "ApprovalPolicy" p
CROSS JOIN (VALUES (1, 'permission', 'employees:approve'), (2, 'permission', 'payroll:issue_send')) AS s("order", "mode", "permission")
WHERE p."targetType" = 'final_settlement'
ON CONFLICT ("policyId", "order") DO NOTHING;