-- Migration: move sales entities to sales schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CrmContact') THEN
        INSERT INTO sales.contact (
            id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at
        )
        SELECT
            id, "firstName", "lastName", email, phone, company, "type", status, notes, tags, "createdAt", "updatedAt"
        FROM public."CrmContact"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CrmDeal') THEN
        INSERT INTO sales.deal (
            id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at
        )
        SELECT
            id, title, "clientId", stage, value, currency, probability, "expectedCloseDate", status, "assignedTo", notes, "createdAt", "updatedAt"
        FROM public."CrmDeal"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Inquiry') THEN
        INSERT INTO sales.inquiry (
            id, inquiry_type, subject, message, status, priority, requester_name, requester_email, requester_phone, assignee_id, deal_id, created_at, updated_at
        )
        SELECT
            id, "type", subject, message, status, priority, "name", email, phone, "assignedTo", "dealId", "createdAt", "updatedAt"
        FROM public."Inquiry"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Quotation') THEN
        INSERT INTO sales.quotation (
            id, quotation_number, deal_id, contact_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at
        )
        SELECT
            id, "quotationNumber", "dealId", "clientId", status, subtotal, discount, "vatRate", "vatAmount", total, currency, "validUntil", terms, notes, "issuedAt", "createdAt", "updatedAt"
        FROM public."Quotation"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'QuotationLineItem') THEN
        INSERT INTO sales.quotation_item (
            id, quotation_id, description, quantity, unit_price, amount, sort_order
        )
        SELECT
            id, "quotationId", description, quantity, "unitPrice", amount, "sortOrder"
        FROM public."QuotationLineItem"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Campaign') THEN
        INSERT INTO sales.campaign (
            id, name, subject, body, status, sent_at, created_at, updated_at
        )
        SELECT
            id, name, subject, body, status, "sentAt", "createdAt", "updatedAt"
        FROM public."Campaign"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
