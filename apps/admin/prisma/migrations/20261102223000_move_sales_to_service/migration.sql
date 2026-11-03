-- Migration: move sales entities to sales schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CrmContact') THEN
        INSERT INTO sales.contact (
            id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at
        )
        SELECT
            id, "firstName", "lastName", email, phone, "companyName", COALESCE("contactType", 'lead'), 'active', notes, '{}'::text[], "createdAt", "updatedAt"
        FROM public."CrmContact"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CrmDeal') THEN
        INSERT INTO sales.deal (
            id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at
        )
        SELECT
            id, title, "contactId", "dealStage", "dealValue", currency, probability, "expectedCloseDate",
            CASE WHEN "dealStage" = 'won' THEN 'won' WHEN "dealStage" = 'lost' THEN 'lost' ELSE 'open' END,
            "assignedTo", notes, "createdAt", "updatedAt"
        FROM public."CrmDeal"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Inquiry') THEN
        INSERT INTO sales.inquiry (
            id, inquiry_type, subject, message, status, priority, requester_name, requester_email, requester_phone, assignee_id, deal_id, created_at, updated_at
        )
        SELECT
            i.id,
            COALESCE(i."serviceType", 'general'),
            COALESCE(i."projectReference", i.reference, 'General Inquiry'),
            i.message,
            i.status,
            i.priority,
            i.name,
            i.email,
            i.phone,
            i."assignedToId",
            d.id,
            i."createdAt",
            COALESCE(i."resolvedAt", i."confirmedAt", i."approvedAt", i."createdAt")
        FROM public."Inquiry" i
        LEFT JOIN public."CrmDeal" d ON d."sourceInquiryId" = i.id
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Quotation') THEN
        INSERT INTO sales.quotation (
            id, quotation_number, deal_id, contact_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at
        )
        SELECT
            id, "quotationNumber", "dealId", "clientId", status, subtotal, "discountAmount", "vatPercentage", "vatAmount", "totalAmount", currency, "validUntilDate", COALESCE("termsEn", "termsAr"), NULL, "issueDate"::timestamp with time zone, "createdAt", "updatedAt"
        FROM public."Quotation"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'QuotationLineItem') THEN
        INSERT INTO sales.quotation_item (
            id, quotation_id, description, quantity, unit_price, amount, sort_order
        )
        SELECT
            id, "quotationId", "descriptionEn", quantity, "unitPrice", "lineTotal", "orderIndex"
        FROM public."QuotationLineItem"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Campaign') THEN
        INSERT INTO sales.campaign (
            id, name, subject, body, status, sent_at, created_at, updated_at
        )
        SELECT
            id, name, code, COALESCE(notes, channel, 'No content'), status, "startDate"::timestamp with time zone, "createdAt", "updatedAt"
        FROM public."Campaign"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
