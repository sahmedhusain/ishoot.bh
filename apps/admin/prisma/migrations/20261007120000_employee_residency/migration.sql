-- Employee identity and residency: nationality, passport, CPR expiry, and visas, permits and other documents with costs.
ALTER TABLE "Employee"
ADD COLUMN "cprExpiryDate" DATE,
ADD COLUMN "nationality" TEXT,
ADD COLUMN "dateOfBirth" DATE,
ADD COLUMN "gender" TEXT,
ADD COLUMN "passportNumber" TEXT,
ADD COLUMN "passportCountry" TEXT,
ADD COLUMN "passportExpiryDate" DATE;

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_gender_check" CHECK (
    "gender" IS NULL
    OR "gender" IN ('male', 'female')
);

CREATE TABLE "EmployeeCredential" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "visaType" TEXT,
    "label" TEXT,
    "number" TEXT,
    "issuingCountry" TEXT,
    "issueDate" DATE,
    "expiryDate" DATE,
    "sponsor" TEXT,
    "costAmount" DECIMAL(12, 3),
    "costCurrency" TEXT NOT NULL DEFAULT 'BHD',
    "costFrequency" TEXT,
    "costTermMonths" INTEGER,
    "paidBy" TEXT NOT NULL DEFAULT 'company',
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeeCredential_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmployeeCredential_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeCredential_kind_check" CHECK (
        "kind" IN (
            'visa',
            'work_permit',
            'residence_permit',
            'driving_license',
            'health_insurance',
            'medical_fitness',
            'professional_license',
            'other'
        )
    ),
    CONSTRAINT "EmployeeCredential_cost_check" CHECK (
        (
            "costAmount" IS NULL
            AND "costFrequency" IS NULL
        )
        OR (
            "costAmount" >= 0
            AND "costFrequency" IN (
                'one_time',
                'monthly',
                'yearly',
                'term'
            )
            AND (
                "costFrequency" <> 'term'
                OR "costTermMonths" BETWEEN 1 AND 120
            )
        )
    ),
    CONSTRAINT "EmployeeCredential_paidBy_check" CHECK (
        "paidBy" IN ('company', 'employee')
    ),
    CONSTRAINT "EmployeeCredential_dates_check" CHECK (
        "issueDate" IS NULL
        OR "expiryDate" IS NULL
        OR "expiryDate" >= "issueDate"
    )
);

CREATE INDEX "EmployeeCredential_employeeId_idx" ON "EmployeeCredential" ("employeeId");

CREATE INDEX "EmployeeCredential_expiryDate_idx" ON "EmployeeCredential" ("expiryDate");