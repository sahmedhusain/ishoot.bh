-- Migration: move workflow entities to workflow schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ApprovalRequest') THEN
        INSERT INTO workflow.approval_request (
            id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at
        )
        SELECT
            id, kind, "entityId", "requesterId", status, priority, reason, "createdAt", "updatedAt"
        FROM public."ApprovalRequest"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ApprovalDecision') THEN
        INSERT INTO workflow.approval_decision (
            id, request_id, approver_id, decision, comments, decided_at
        )
        SELECT
            id, "requestId", "approverId", decision, comments, "decidedAt"
        FROM public."ApprovalDecision"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SignatureRequest') THEN
        INSERT INTO workflow.signature_request (
            id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at, created_at
        )
        SELECT
            id, title, "documentType", "documentId", "requestedFrom", status, "signatureUrl", "signedAt", "expiresAt", "createdAt"
        FROM public."SignatureRequest"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'LetterTemplate') THEN
        INSERT INTO workflow.letter_template (
            id, name_en, name_ar, template_body, sort_order
        )
        SELECT
            id, "nameEn", "nameAr", "templateBody", "sortOrder"
        FROM public."LetterTemplate"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'OfficialLetter') THEN
        INSERT INTO workflow.official_letter (
            id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, created_at
        )
        SELECT
            id, "letterNumber", "templateId", "recipientName", "recipientTitle", subject, body, status, "createdAt"
        FROM public."OfficialLetter"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MinuteOfMeeting') THEN
        INSERT INTO workflow.minute_of_meeting (
            id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at
        )
        SELECT
            id, "momNumber", title, "meetingDate", attendees, discussion, "actionItems", status, "createdAt"
        FROM public."MinuteOfMeeting"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Task') THEN
        INSERT INTO workflow.task (
            id, title, description, assigned_to, due_date, status, priority, related_entity_type, related_entity_id, created_at, updated_at
        )
        SELECT
            id, title, description, "assignedTo", "dueDate", status, priority, "relatedEntityType", "relatedEntityId", "createdAt", "updatedAt"
        FROM public."Task"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'CalendarEvent') THEN
        INSERT INTO workflow.calendar_event (
            id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type, created_at
        )
        SELECT
            id, title, description, "startTime", "endTime", "isAllDay", location, "organizerId", "eventType", "createdAt"
        FROM public."CalendarEvent"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
