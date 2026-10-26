-- Payslips and salary certificates are requested in Arabic, English or both; earlier requests keep both.
ALTER TABLE "SalaryDocument" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY['ar', 'en']::TEXT[];

ALTER TABLE "SalaryDocument" ADD CONSTRAINT "SalaryDocument_languages_check"
  CHECK (cardinality("languages") BETWEEN 1 AND 2 AND "languages" <@ ARRAY['ar', 'en']::TEXT[]);