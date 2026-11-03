-- Import legacy ActivityLog into audit.event
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.event (
    id          uuid        NOT NULL,
    subject     text        NOT NULL,
    service     text        NOT NULL,
    entity      text        NOT NULL,
    verb        text        NOT NULL,
    actor       text,
    occurred_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    payload     jsonb       NOT NULL,
    trace_id    text,
    CONSTRAINT event_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS event_occurred_idx ON audit.event (occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS event_subject_idx ON audit.event (subject, occurred_at DESC);
CREATE INDEX IF NOT EXISTS event_service_idx ON audit.event (service, occurred_at DESC);
CREATE INDEX IF NOT EXISTS event_actor_idx ON audit.event (actor, occurred_at DESC) WHERE actor IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ActivityLog') THEN
        INSERT INTO audit.event (id, subject, service, entity, verb, actor, occurred_at, received_at, payload)
        SELECT
            gen_random_uuid(),
            CASE
                WHEN "entityType" IN ('user', 'role', 'session') THEN 'identity.' || "entityType" || '.' || "action"
                WHEN "entityType" IN ('invoice', 'payment', 'expense', 'tax_rate') THEN 'finance.' || "entityType" || '.' || "action"
                WHEN "entityType" IN ('quotation', 'sales_order', 'deal', 'client') THEN 'sales.' || "entityType" || '.' || "action"
                WHEN "entityType" IN ('employee', 'department', 'leave_request') THEN 'hr.' || "entityType" || '.' || "action"
                WHEN "entityType" IN ('product', 'inventory', 'supplier') THEN 'inventory.' || "entityType" || '.' || "action"
                WHEN "entityType" IN ('ticket', 'sla') THEN 'itsm.' || "entityType" || '.' || "action"
                ELSE 'system.' || "entityType" || '.' || "action"
            END,
            CASE
                WHEN "entityType" IN ('user', 'role', 'session') THEN 'identity'
                WHEN "entityType" IN ('invoice', 'payment', 'expense', 'tax_rate') THEN 'finance'
                WHEN "entityType" IN ('quotation', 'sales_order', 'deal', 'client') THEN 'sales'
                WHEN "entityType" IN ('employee', 'department', 'leave_request') THEN 'hr'
                WHEN "entityType" IN ('product', 'inventory', 'supplier') THEN 'inventory'
                WHEN "entityType" IN ('ticket', 'sla') THEN 'itsm'
                ELSE 'system'
            END,
            "entityType",
            "action",
            'staff:' || "userId",
            "createdAt" AT TIME ZONE 'UTC',
            "createdAt" AT TIME ZONE 'UTC',
            jsonb_build_object(
                'legacyId', id,
                'entityId', "entityId",
                'details', details,
                'diffPayload', "diffPayload",
                'ipAddress', "ipAddress",
                'userAgent', "userAgent"
            )
        FROM public."ActivityLog"
        WHERE NOT EXISTS (
            SELECT 1 FROM audit.event e WHERE (e.payload->>'legacyId') = public."ActivityLog".id
        );
    END IF;
END $$;
