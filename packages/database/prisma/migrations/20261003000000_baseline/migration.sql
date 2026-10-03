-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "permissions" JSONB,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySetting" (
    "id" TEXT NOT NULL,
    "companyNameEn" TEXT NOT NULL DEFAULT 'Production Studio',
    "companyNameAr" TEXT NOT NULL DEFAULT 'استوديو الإنتاج',
    "crNumber" TEXT,
    "vatId" TEXT,
    "vatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vatPercentage" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "vatCertificateUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'BHD',
    "currencyDecimals" INTEGER NOT NULL DEFAULT 3,
    "addressEn" TEXT,
    "addressAr" TEXT,
    "phone" TEXT,
    "whatsappPhone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "youtubeUrl" TEXT,
    "bankName" TEXT,
    "bankIban" TEXT,
    "bankAccountNumber" TEXT,
    "bankSwift" TEXT,
    "logoUrl" TEXT,
    "darkLogoUrl" TEXT,
    "iconUrl" TEXT,
    "darkIconUrl" TEXT,
    "stampUrl" TEXT,
    "signatureUrl" TEXT,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceNextNumber" INTEGER NOT NULL DEFAULT 1,
    "receiptPrefix" TEXT NOT NULL DEFAULT 'RCT',
    "receiptNextNumber" INTEGER NOT NULL DEFAULT 1,
    "ceoNameEn" TEXT,
    "ceoNameAr" TEXT,
    "ceoTitleEn" TEXT,
    "ceoTitleAr" TEXT,
    "ceoQuoteEn" TEXT,
    "ceoQuoteAr" TEXT,
    "missionEn" TEXT,
    "missionAr" TEXT,
    "visionEn" TEXT,
    "visionAr" TEXT,
    "aboutTextEn" TEXT,
    "aboutTextAr" TEXT,
    "termsEn" TEXT,
    "termsAr" TEXT,
    "rulesEn" TEXT,
    "rulesAr" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAsset" (
    "id" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroBanner" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "subtitleEn" TEXT,
    "subtitleAr" TEXT,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ctaLabelEn" TEXT,
    "ctaLabelAr" TEXT,
    "ctaLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PortfolioCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "thumbnailUrl" TEXT NOT NULL,
    "previewVideoUrl" TEXT,
    "fullVideoUrl" TEXT,
    "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "credits" JSONB NOT NULL DEFAULT '{}',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLogo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "isDarkLogo" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClientLogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioEquipment" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "brand" TEXT,
    "dailyRateBhd" DECIMAL(10,3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "specification" TEXT,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNorm" TEXT,
    "phone" TEXT,
    "phoneE164" TEXT,
    "companyName" TEXT,
    "serviceType" TEXT,
    "budgetRange" TEXT,
    "timeline" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "source" TEXT NOT NULL DEFAULT 'website',
    "customerId" TEXT,
    "mergeFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "emailNorm" TEXT,
    "phone" TEXT,
    "phoneE164" TEXT,
    "companyName" TEXT,
    "jobTitle" TEXT,
    "contactType" TEXT NOT NULL DEFAULT 'client',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDeal" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "dealStage" TEXT NOT NULL DEFAULT 'lead',
    "dealValue" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "probability" INTEGER NOT NULL DEFAULT 50,
    "expectedCloseDate" DATE,
    "shootDate" DATE,
    "lostReason" TEXT,
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "clientId" TEXT,
    "issueDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE NOT NULL,
    "subtotal" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "vatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vatPercentage" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "vatAmount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "discountType" TEXT NOT NULL DEFAULT 'none',
    "discountValue" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "discountAmount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "totalAmount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "language" TEXT NOT NULL DEFAULT 'ar',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pdfStoragePath" TEXT,
    "deliveryChannel" TEXT,
    "deliveredAt" TIMESTAMPTZ,
    "notesEn" TEXT,
    "notesAr" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "serviceId" TEXT,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "unitPrice" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "lineTotal" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "paymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
    "referenceNumber" TEXT,
    "notes" TEXT,
    "receiptPdfPath" TEXT,
    "notificationChannel" TEXT,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#9EADA9',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "dealId" TEXT,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "amount" DECIMAL(12,3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "expenseDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendorName" TEXT,
    "receiptUrl" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceInterval" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "color" TEXT DEFAULT '#09937F',
    "eventType" TEXT NOT NULL DEFAULT 'meeting',
    "dealId" TEXT,
    "createdById" TEXT,
    "googleEventId" TEXT,
    "googleCalendarId" TEXT,
    "recurrence" TEXT,
    "reminders" JSONB,
    "attendees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "diffPayload" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "color" TEXT NOT NULL DEFAULT '#09937F',
    "entityType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "category" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "bodyJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "dealId" TEXT,
    "contactId" TEXT,
    "templateId" TEXT,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT,
    "bodyHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "signatureHash" TEXT,
    "signedAt" TIMESTAMP(3),
    "validFrom" DATE,
    "validUntil" DATE,
    "pdfStoragePath" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "checksum" TEXT,
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDocument" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT,
    "category" TEXT NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "validFrom" DATE,
    "validUntil" DATE,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'production',
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'day',
    "defaultRate" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLink" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureToggle" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "FeatureToggle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "authorEn" TEXT NOT NULL,
    "authorAr" TEXT NOT NULL,
    "companyEn" TEXT,
    "companyAr" TEXT,
    "quoteEn" TEXT NOT NULL,
    "quoteAr" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "year" TEXT NOT NULL DEFAULT '2026',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "answerAr" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statistic" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "subLabelEn" TEXT,
    "subLabelAr" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Statistic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAsset_assetKey_key" ON "CompanyAsset"("assetKey");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioCategory_slug_key" ON "PortfolioCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioItem_slug_key" ON "PortfolioItem"("slug");

-- CreateIndex
CREATE INDEX "Inquiry_customerId_idx" ON "Inquiry"("customerId");

-- CreateIndex
CREATE INDEX "Inquiry_emailNorm_idx" ON "Inquiry"("emailNorm");

-- CreateIndex
CREATE INDEX "Inquiry_phoneE164_idx" ON "Inquiry"("phoneE164");

-- CreateIndex
CREATE INDEX "CrmContact_emailNorm_idx" ON "CrmContact"("emailNorm");

-- CreateIndex
CREATE INDEX "CrmContact_phoneE164_idx" ON "CrmContact"("phoneE164");

-- CreateIndex
CREATE INDEX "CrmDeal_contactId_idx" ON "CrmDeal"("contactId");

-- CreateIndex
CREATE INDEX "CrmDeal_dealStage_idx" ON "CrmDeal"("dealStage");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_dealId_idx" ON "Invoice"("dealId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_serviceId_idx" ON "InvoiceLineItem"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_slug_key" ON "ExpenseCategory"("slug");

-- CreateIndex
CREATE INDEX "Expense_dealId_idx" ON "Expense"("dealId");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "CalendarEvent_dealId_idx" ON "CalendarEvent"("dealId");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "Permission_role_idx" ON "Permission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_role_resource_action_key" ON "Permission"("role", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_slug_key" ON "DocumentTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_dealId_idx" ON "Contract"("dealId");

-- CreateIndex
CREATE INDEX "Contract_contactId_idx" ON "Contract"("contactId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_sourceEntityType_sourceEntityId_idx" ON "GeneratedDocument"("sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "CompanyDocument_category_idx" ON "CompanyDocument"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE INDEX "Service_category_idx" ON "Service"("category");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureToggle_moduleKey_key" ON "FeatureToggle"("moduleKey");

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PortfolioCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

