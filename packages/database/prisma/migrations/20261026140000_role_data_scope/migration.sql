-- Which records a role sees in each area (own, department or all). Roles without a row follow their template.
CREATE TABLE "RoleDataScope" (
    "role" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    CONSTRAINT "RoleDataScope_pkey" PRIMARY KEY ("role", "area")
);
