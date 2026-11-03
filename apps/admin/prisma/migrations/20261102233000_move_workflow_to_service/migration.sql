-- Migration: move workflow entities to workflow schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ApprovalRequest') THEN
        INSERT INTO workflow.approval_request (
            id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at
        )
        SELECT
            id, "targetType", "targetId", "requestedById", status, 'normal', "discountReason", "createdAt", "updatedAt"
        FROM public."ApprovalRequest"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ApprovalDecision') THEN
        INSERT INTO workflow.approval_decision (
            id, request_id, approver_id, decision, comments, decided_at
        )
        SELECT
            id, "approvalRequestId", "decidedById", decision, reason, "decidedAt"
        FROM public."ApprovalDecision"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SignatureRequest') THEN
        INSERT INTO workflow.signature_request (
            id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at, created_at
        )
        SELECT
            id,
            COALESCE("recipientEmail", "signerName", "documentType" || ' ' || "documentId"),
            "documentType",
            "documentId",
            COALESCE("recipientEmail", "signerName", 'signer'),
            status,
            "signatureData",
            "signedAt",
            "expiresAt",
            "createdAt"
        FROM public."SignatureRequest"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'LetterTemplate') THEN
        INSERT INTO workflow.letter_template (
            id, name_en, name_ar, template_body, sort_order
        )
        SELECT
            id, "nameEn", "nameAr", COALESCE(NULLIF("bodyEn", ''), "bodyAr", ''), "displayOrder"
        FROM public."LetterTemplate"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OfficialLetter') THEN
        INSERT INTO workflow.official_letter (
            id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, created_at
        )
        SELECT
            id,
            reference,
            "templateId",
            COALESCE("recipientName", 'Recipient'),
            "recipientTitle",
            COALESCE(NULLIF("subjectEn", ''), "subjectAr", 'Official Letter'),
            COALESCE(NULLIF("bodyEn", ''), "bodyAr", 'Body'),
            status,
            "createdAt"
        FROM public."OfficialLetter"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MinuteOfMeeting') THEN
        INSERT INTO workflow.minute_of_meeting (
            id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at
        )
        SELECT
            m.id, m."momNumber", m.title, m."meetingDate",
            COALESCE(att.arr, '{}'::text[]),
            COALESCE(m.agenda, m.notes, 'Meeting'),
            m."actionItems"::text,
            m.status,
            m."createdAt"
        FROM public."MinuteOfMeeting" m
        LEFT JOIN LATERAL (
            SELECT ARRAY_AGG(elem) AS arr FROM jsonb_array_elements_text(m.attendees) elem
        ) att ON true
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Task') THEN
        INSERT INTO workflow.task (
            id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at
        )
        SELECT
            id, title, description, "assigneeId", "dueDate", status, priority, "linkType", "linkId", "createdAt", "updatedAt"
        FROM public."Task"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CalendarEvent') THEN
        INSERT INTO workflow.calendar_event (
            id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type, created_at
        )
        SELECT
            id, title, description, "startDate", "endDate", "allDay", location, COALESCE("createdById", 'system'), "eventType", "createdAt"
        FROM public."CalendarEvent"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
