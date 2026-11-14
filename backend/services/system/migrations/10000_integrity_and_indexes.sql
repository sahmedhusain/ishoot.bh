-- +goose Up
ALTER TABLE system.announcement_receipt ALTER COLUMN announcement_id SET NOT NULL;
ALTER TABLE system.announcement_receipt ALTER COLUMN user_id SET NOT NULL;
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'system.announcement_receipt'::regclass AND contype = 'p') THEN
        DELETE FROM system.announcement_receipt a USING system.announcement_receipt b WHERE a.ctid < b.ctid AND a.announcement_id = b.announcement_id AND a.user_id = b.user_id;
        ALTER TABLE system.announcement_receipt ADD CONSTRAINT announcement_receipt_pkey PRIMARY KEY (announcement_id, user_id);
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_account_change_request_user_id ON system.account_change_request (user_id);
CREATE INDEX IF NOT EXISTS idx_account_change_request_requested_by_id ON system.account_change_request (requested_by_id);
CREATE INDEX IF NOT EXISTS idx_account_change_request_decided_by_id ON system.account_change_request (decided_by_id);
CREATE INDEX IF NOT EXISTS idx_accounting_period_closed_by_id ON system.accounting_period (closed_by_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON system.activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON system.activity_log (entity_id);
CREATE INDEX IF NOT EXISTS idx_announcement_created_by_id ON system.announcement (created_by_id);
CREATE INDEX IF NOT EXISTS idx_announcement_signed_by_id ON system.announcement (signed_by_id);
CREATE INDEX IF NOT EXISTS idx_announcement_receipt_announcement_id ON system.announcement_receipt (announcement_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcement_receipt_announcement_id' AND conrelid = 'system.announcement_receipt'::regclass) THEN
        DELETE FROM system.announcement_receipt WHERE announcement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.announcement p WHERE p.id = system.announcement_receipt.announcement_id);
        ALTER TABLE system.announcement_receipt ADD CONSTRAINT fk_announcement_receipt_announcement_id FOREIGN KEY (announcement_id) REFERENCES system.announcement(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_announcement_receipt_user_id ON system.announcement_receipt (user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_created_by ON system.api_key (created_by);
CREATE INDEX IF NOT EXISTS idx_approval_decision_approval_request_id ON system.approval_decision (approval_request_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_approval_decision_approval_request_id' AND conrelid = 'system.approval_decision'::regclass) THEN
        UPDATE system.approval_decision SET approval_request_id = NULL WHERE approval_request_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.approval_request p WHERE p.id = system.approval_decision.approval_request_id);
        ALTER TABLE system.approval_decision ADD CONSTRAINT fk_approval_decision_approval_request_id FOREIGN KEY (approval_request_id) REFERENCES system.approval_request(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_approval_decision_decided_by_id ON system.approval_decision (decided_by_id);
CREATE INDEX IF NOT EXISTS idx_approval_policy_step_policy_id ON system.approval_policy_step (policy_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_approval_policy_step_policy_id' AND conrelid = 'system.approval_policy_step'::regclass) THEN
        DELETE FROM system.approval_policy_step WHERE policy_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.approval_policy p WHERE p.id = system.approval_policy_step.policy_id);
        ALTER TABLE system.approval_policy_step ADD CONSTRAINT fk_approval_policy_step_policy_id FOREIGN KEY (policy_id) REFERENCES system.approval_policy(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_approval_policy_step_user_id ON system.approval_policy_step (user_id);
CREATE INDEX IF NOT EXISTS idx_approval_policy_step_escalate_user_id ON system.approval_policy_step (escalate_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_request_target_id ON system.approval_request (target_id);
CREATE INDEX IF NOT EXISTS idx_approval_request_requested_by_id ON system.approval_request (requested_by_id);
CREATE INDEX IF NOT EXISTS idx_approval_request_policy_id ON system.approval_request (policy_id);
CREATE INDEX IF NOT EXISTS idx_attachment_entity_id ON system.attachment (entity_id);
CREATE INDEX IF NOT EXISTS idx_attachment_uploaded_by_id ON system.attachment (uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_backup_record_created_by ON system.backup_record (created_by);
CREATE INDEX IF NOT EXISTS idx_bank_settlement_payment_id ON system.bank_settlement (payment_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_segment_id ON system.broadcast (segment_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaign_id ON system.broadcast (campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_created_by_id ON system.broadcast (created_by_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipient_broadcast_id ON system.broadcast_recipient (broadcast_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_broadcast_recipient_broadcast_id' AND conrelid = 'system.broadcast_recipient'::regclass) THEN
        DELETE FROM system.broadcast_recipient WHERE broadcast_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.broadcast p WHERE p.id = system.broadcast_recipient.broadcast_id);
        ALTER TABLE system.broadcast_recipient ADD CONSTRAINT fk_broadcast_recipient_broadcast_id FOREIGN KEY (broadcast_id) REFERENCES system.broadcast(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_broadcast_recipient_customer_id ON system.broadcast_recipient (customer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_deal_id ON system.calendar_event (deal_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_created_by_id ON system.calendar_event (created_by_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_google_event_id ON system.calendar_event (google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_google_calendar_id ON system.calendar_event (google_calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_feed_token_user_id ON system.calendar_feed_token (user_id);
CREATE INDEX IF NOT EXISTS idx_client_contact_person_contact_id ON system.client_contact_person (contact_id);
CREATE INDEX IF NOT EXISTS idx_client_signature_document_id ON system.client_signature (document_id);
CREATE INDEX IF NOT EXISTS idx_client_signature_created_by_id ON system.client_signature (created_by_id);
CREATE INDEX IF NOT EXISTS idx_cod_settlement_driver_id ON system.cod_settlement (driver_id);
CREATE INDEX IF NOT EXISTS idx_cod_settlement_agency_id ON system.cod_settlement (agency_id);
CREATE INDEX IF NOT EXISTS idx_cod_settlement_settled_by_id ON system.cod_settlement (settled_by_id);
CREATE INDEX IF NOT EXISTS idx_communication_message_thread_id ON system.communication_message (thread_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_communication_message_thread_id' AND conrelid = 'system.communication_message'::regclass) THEN
        DELETE FROM system.communication_message WHERE thread_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.communication_thread p WHERE p.id = system.communication_message.thread_id);
        ALTER TABLE system.communication_message ADD CONSTRAINT fk_communication_message_thread_id FOREIGN KEY (thread_id) REFERENCES system.communication_thread(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_communication_message_message_id ON system.communication_message (message_id);
CREATE INDEX IF NOT EXISTS idx_communication_message_invoice_id ON system.communication_message (invoice_id);
CREATE INDEX IF NOT EXISTS idx_communication_message_quotation_id ON system.communication_message (quotation_id);
CREATE INDEX IF NOT EXISTS idx_communication_settings_updated_by_id ON system.communication_settings (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_communication_thread_contact_id ON system.communication_thread (contact_id);
CREATE INDEX IF NOT EXISTS idx_communication_thread_inquiry_id ON system.communication_thread (inquiry_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_communication_thread_inquiry_id' AND conrelid = 'system.communication_thread'::regclass) THEN
        UPDATE system.communication_thread SET inquiry_id = NULL WHERE inquiry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.inquiry p WHERE p.id = system.communication_thread.inquiry_id);
        ALTER TABLE system.communication_thread ADD CONSTRAINT fk_communication_thread_inquiry_id FOREIGN KEY (inquiry_id) REFERENCES system.inquiry(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_communication_thread_assigned_to ON system.communication_thread (assigned_to);
CREATE INDEX IF NOT EXISTS idx_company_document_uploaded_by_id ON system.company_document (uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_company_setting_vat_id ON system.company_setting (vat_id);
CREATE INDEX IF NOT EXISTS idx_contract_deal_id ON system.contract (deal_id);
CREATE INDEX IF NOT EXISTS idx_contract_contact_id ON system.contract (contact_id);
CREATE INDEX IF NOT EXISTS idx_contract_template_id ON system.contract (template_id);
CREATE INDEX IF NOT EXISTS idx_contract_created_by_id ON system.contract (created_by_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layout_user_id ON system.dashboard_layout (user_id);
CREATE INDEX IF NOT EXISTS idx_document_fx_document_id ON system.document_fx (document_id);
CREATE INDEX IF NOT EXISTS idx_document_fx_rate_snapshot_id ON system.document_fx (rate_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_email_job_mom_id ON system.email_job (mom_id);
CREATE INDEX IF NOT EXISTS idx_email_job_created_by_id ON system.email_job (created_by_id);
CREATE INDEX IF NOT EXISTS idx_email_job_provider_id ON system.email_job (provider_id);
CREATE INDEX IF NOT EXISTS idx_employment_record_employee_id ON system.employment_record (employee_id);
CREATE INDEX IF NOT EXISTS idx_final_settlement_employee_id ON system.final_settlement (employee_id);
CREATE INDEX IF NOT EXISTS idx_final_settlement_handover_id ON system.final_settlement (handover_id);
CREATE INDEX IF NOT EXISTS idx_final_settlement_line_settlement_id ON system.final_settlement_line (settlement_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_final_settlement_line_settlement_id' AND conrelid = 'system.final_settlement_line'::regclass) THEN
        DELETE FROM system.final_settlement_line WHERE settlement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.final_settlement p WHERE p.id = system.final_settlement_line.settlement_id);
        ALTER TABLE system.final_settlement_line ADD CONSTRAINT fk_final_settlement_line_settlement_id FOREIGN KEY (settlement_id) REFERENCES system.final_settlement(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_generated_document_source_entity_id ON system.generated_document (source_entity_id);
CREATE INDEX IF NOT EXISTS idx_generated_document_generated_by_id ON system.generated_document (generated_by_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON system.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_customer_id ON system.inquiry (customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_assigned_to_id ON system.inquiry (assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_note_inquiry_id ON system.inquiry_note (inquiry_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inquiry_note_inquiry_id' AND conrelid = 'system.inquiry_note'::regclass) THEN
        DELETE FROM system.inquiry_note WHERE inquiry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.inquiry p WHERE p.id = system.inquiry_note.inquiry_id);
        ALTER TABLE system.inquiry_note ADD CONSTRAINT fk_inquiry_note_inquiry_id FOREIGN KEY (inquiry_id) REFERENCES system.inquiry(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_inquiry_note_author_id ON system.inquiry_note (author_id);
CREATE INDEX IF NOT EXISTS idx_integration_setting_updated_by_id ON system.integration_setting (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_label_print_job_original_job_id ON system.label_print_job (original_job_id);
CREATE INDEX IF NOT EXISTS idx_label_print_job_created_by_id ON system.label_print_job (created_by_id);
CREATE INDEX IF NOT EXISTS idx_label_print_job_confirmed_by_id ON system.label_print_job (confirmed_by_id);
CREATE INDEX IF NOT EXISTS idx_legal_matter_assignee_id ON system.legal_matter (assignee_id);
CREATE INDEX IF NOT EXISTS idx_legal_matter_created_by_id ON system.legal_matter (created_by_id);
CREATE INDEX IF NOT EXISTS idx_legal_matter_event_matter_id ON system.legal_matter_event (matter_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_legal_matter_event_matter_id' AND conrelid = 'system.legal_matter_event'::regclass) THEN
        DELETE FROM system.legal_matter_event WHERE matter_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.legal_matter p WHERE p.id = system.legal_matter_event.matter_id);
        ALTER TABLE system.legal_matter_event ADD CONSTRAINT fk_legal_matter_event_matter_id FOREIGN KEY (matter_id) REFERENCES system.legal_matter(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_legal_matter_event_by_id ON system.legal_matter_event (by_id);
CREATE INDEX IF NOT EXISTS idx_media_coverage_article_id ON system.media_coverage (article_id);
CREATE INDEX IF NOT EXISTS idx_media_coverage_created_by_id ON system.media_coverage (created_by_id);
CREATE INDEX IF NOT EXISTS idx_message_attachment_message_id ON system.message_attachment (message_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_attachment_message_id' AND conrelid = 'system.message_attachment'::regclass) THEN
        DELETE FROM system.message_attachment WHERE message_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.communication_message p WHERE p.id = system.message_attachment.message_id);
        ALTER TABLE system.message_attachment ADD CONSTRAINT fk_message_attachment_message_id FOREIGN KEY (message_id) REFERENCES system.communication_message(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_minute_of_meeting_deal_id ON system.minute_of_meeting (deal_id);
CREATE INDEX IF NOT EXISTS idx_minute_of_meeting_client_id ON system.minute_of_meeting (client_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON system.notification (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_entity_id ON system.notification (entity_id);
CREATE INDEX IF NOT EXISTS idx_official_letter_template_id ON system.official_letter (template_id);
CREATE INDEX IF NOT EXISTS idx_official_letter_employee_id ON system.official_letter (employee_id);
CREATE INDEX IF NOT EXISTS idx_official_letter_created_by_id ON system.official_letter (created_by_id);
CREATE INDEX IF NOT EXISTS idx_official_letter_signer_id ON system.official_letter (signer_id);
CREATE INDEX IF NOT EXISTS idx_package_content_package_id ON system.package_content (package_id);
CREATE INDEX IF NOT EXISTS idx_package_content_product_id ON system.package_content (product_id);
CREATE INDEX IF NOT EXISTS idx_payslip_payroll_item_id ON system.payslip (payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_payslip_employee_id ON system.payslip (employee_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_request_user_id ON system.profile_change_request (user_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_request_requested_by_id ON system.profile_change_request (requested_by_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_request_manager_id ON system.profile_change_request (manager_id);
CREATE INDEX IF NOT EXISTS idx_project_department_id ON system.project (department_id);
CREATE INDEX IF NOT EXISTS idx_project_owner_id ON system.project (owner_id);
CREATE INDEX IF NOT EXISTS idx_project_created_by_id ON system.project (created_by_id);
CREATE INDEX IF NOT EXISTS idx_report_schedule_owner_id ON system.report_schedule (owner_id);
CREATE INDEX IF NOT EXISTS idx_request_assignment_inquiry_id ON system.request_assignment (inquiry_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_request_assignment_inquiry_id' AND conrelid = 'system.request_assignment'::regclass) THEN
        UPDATE system.request_assignment SET inquiry_id = NULL WHERE inquiry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.inquiry p WHERE p.id = system.request_assignment.inquiry_id);
        ALTER TABLE system.request_assignment ADD CONSTRAINT fk_request_assignment_inquiry_id FOREIGN KEY (inquiry_id) REFERENCES system.inquiry(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_request_assignment_assigned_to_id ON system.request_assignment (assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_request_assignment_assigned_by_id ON system.request_assignment (assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_request_comment_inquiry_id ON system.request_comment (inquiry_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_request_comment_inquiry_id' AND conrelid = 'system.request_comment'::regclass) THEN
        DELETE FROM system.request_comment WHERE inquiry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.inquiry p WHERE p.id = system.request_comment.inquiry_id);
        ALTER TABLE system.request_comment ADD CONSTRAINT fk_request_comment_inquiry_id FOREIGN KEY (inquiry_id) REFERENCES system.inquiry(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_request_comment_author_id ON system.request_comment (author_id);
CREATE INDEX IF NOT EXISTS idx_request_event_inquiry_id ON system.request_event (inquiry_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_request_event_inquiry_id' AND conrelid = 'system.request_event'::regclass) THEN
        DELETE FROM system.request_event WHERE inquiry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.inquiry p WHERE p.id = system.request_event.inquiry_id);
        ALTER TABLE system.request_event ADD CONSTRAINT fk_request_event_inquiry_id FOREIGN KEY (inquiry_id) REFERENCES system.inquiry(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_request_event_actor_id ON system.request_event (actor_id);
CREATE INDEX IF NOT EXISTS idx_review_client_id ON system.review (client_id);
CREATE INDEX IF NOT EXISTS idx_route_sheet_driver_id ON system.route_sheet (driver_id);
CREATE INDEX IF NOT EXISTS idx_route_sheet_vehicle_id ON system.route_sheet (vehicle_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_route_sheet_vehicle_id' AND conrelid = 'system.route_sheet'::regclass) THEN
        UPDATE system.route_sheet SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM system.vehicle p WHERE p.id = system.route_sheet.vehicle_id);
        ALTER TABLE system.route_sheet ADD CONSTRAINT fk_route_sheet_vehicle_id FOREIGN KEY (vehicle_id) REFERENCES system.vehicle(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_route_sheet_created_by_id ON system.route_sheet (created_by_id);
CREATE INDEX IF NOT EXISTS idx_serial_generation_product_id ON system.serial_generation (product_id);
CREATE INDEX IF NOT EXISTS idx_serial_generation_location_id ON system.serial_generation (location_id);
CREATE INDEX IF NOT EXISTS idx_serial_generation_created_by_id ON system.serial_generation (created_by_id);
CREATE INDEX IF NOT EXISTS idx_signature_change_user_id ON system.signature_change (user_id);
CREATE INDEX IF NOT EXISTS idx_signature_change_reviewed_by_id ON system.signature_change (reviewed_by_id);
CREATE INDEX IF NOT EXISTS idx_signature_policy_updated_by_id ON system.signature_policy (updated_by_id);
CREATE INDEX IF NOT EXISTS idx_signature_request_document_id ON system.signature_request (document_id);
CREATE INDEX IF NOT EXISTS idx_signature_request_created_by_id ON system.signature_request (created_by_id);
CREATE INDEX IF NOT EXISTS idx_upload_object_owner_id ON system.upload_object (owner_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_branch_id ON system.warehouse (branch_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_item_customer_id ON system.wishlist_item (customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_item_catalogue_item_id ON system.wishlist_item (catalogue_item_id);

-- +goose Down
DROP INDEX IF EXISTS system.idx_account_change_request_user_id;
DROP INDEX IF EXISTS system.idx_account_change_request_requested_by_id;
DROP INDEX IF EXISTS system.idx_account_change_request_decided_by_id;
DROP INDEX IF EXISTS system.idx_accounting_period_closed_by_id;
DROP INDEX IF EXISTS system.idx_activity_log_user_id;
DROP INDEX IF EXISTS system.idx_activity_log_entity_id;
DROP INDEX IF EXISTS system.idx_announcement_created_by_id;
DROP INDEX IF EXISTS system.idx_announcement_signed_by_id;
DROP INDEX IF EXISTS system.idx_announcement_receipt_announcement_id;
ALTER TABLE system.announcement_receipt DROP CONSTRAINT IF EXISTS fk_announcement_receipt_announcement_id;
DROP INDEX IF EXISTS system.idx_announcement_receipt_user_id;
DROP INDEX IF EXISTS system.idx_api_key_created_by;
DROP INDEX IF EXISTS system.idx_approval_decision_approval_request_id;
ALTER TABLE system.approval_decision DROP CONSTRAINT IF EXISTS fk_approval_decision_approval_request_id;
DROP INDEX IF EXISTS system.idx_approval_decision_decided_by_id;
DROP INDEX IF EXISTS system.idx_approval_policy_step_policy_id;
ALTER TABLE system.approval_policy_step DROP CONSTRAINT IF EXISTS fk_approval_policy_step_policy_id;
DROP INDEX IF EXISTS system.idx_approval_policy_step_user_id;
DROP INDEX IF EXISTS system.idx_approval_policy_step_escalate_user_id;
DROP INDEX IF EXISTS system.idx_approval_request_target_id;
DROP INDEX IF EXISTS system.idx_approval_request_requested_by_id;
DROP INDEX IF EXISTS system.idx_approval_request_policy_id;
DROP INDEX IF EXISTS system.idx_attachment_entity_id;
DROP INDEX IF EXISTS system.idx_attachment_uploaded_by_id;
DROP INDEX IF EXISTS system.idx_backup_record_created_by;
DROP INDEX IF EXISTS system.idx_bank_settlement_payment_id;
DROP INDEX IF EXISTS system.idx_broadcast_segment_id;
DROP INDEX IF EXISTS system.idx_broadcast_campaign_id;
DROP INDEX IF EXISTS system.idx_broadcast_created_by_id;
DROP INDEX IF EXISTS system.idx_broadcast_recipient_broadcast_id;
ALTER TABLE system.broadcast_recipient DROP CONSTRAINT IF EXISTS fk_broadcast_recipient_broadcast_id;
DROP INDEX IF EXISTS system.idx_broadcast_recipient_customer_id;
DROP INDEX IF EXISTS system.idx_calendar_event_deal_id;
DROP INDEX IF EXISTS system.idx_calendar_event_created_by_id;
DROP INDEX IF EXISTS system.idx_calendar_event_google_event_id;
DROP INDEX IF EXISTS system.idx_calendar_event_google_calendar_id;
DROP INDEX IF EXISTS system.idx_calendar_feed_token_user_id;
DROP INDEX IF EXISTS system.idx_client_contact_person_contact_id;
DROP INDEX IF EXISTS system.idx_client_signature_document_id;
DROP INDEX IF EXISTS system.idx_client_signature_created_by_id;
DROP INDEX IF EXISTS system.idx_cod_settlement_driver_id;
DROP INDEX IF EXISTS system.idx_cod_settlement_agency_id;
DROP INDEX IF EXISTS system.idx_cod_settlement_settled_by_id;
DROP INDEX IF EXISTS system.idx_communication_message_thread_id;
ALTER TABLE system.communication_message DROP CONSTRAINT IF EXISTS fk_communication_message_thread_id;
DROP INDEX IF EXISTS system.idx_communication_message_message_id;
DROP INDEX IF EXISTS system.idx_communication_message_invoice_id;
DROP INDEX IF EXISTS system.idx_communication_message_quotation_id;
DROP INDEX IF EXISTS system.idx_communication_settings_updated_by_id;
DROP INDEX IF EXISTS system.idx_communication_thread_contact_id;
DROP INDEX IF EXISTS system.idx_communication_thread_inquiry_id;
ALTER TABLE system.communication_thread DROP CONSTRAINT IF EXISTS fk_communication_thread_inquiry_id;
DROP INDEX IF EXISTS system.idx_communication_thread_assigned_to;
DROP INDEX IF EXISTS system.idx_company_document_uploaded_by_id;
DROP INDEX IF EXISTS system.idx_company_setting_vat_id;
DROP INDEX IF EXISTS system.idx_contract_deal_id;
DROP INDEX IF EXISTS system.idx_contract_contact_id;
DROP INDEX IF EXISTS system.idx_contract_template_id;
DROP INDEX IF EXISTS system.idx_contract_created_by_id;
DROP INDEX IF EXISTS system.idx_dashboard_layout_user_id;
DROP INDEX IF EXISTS system.idx_document_fx_document_id;
DROP INDEX IF EXISTS system.idx_document_fx_rate_snapshot_id;
DROP INDEX IF EXISTS system.idx_email_job_mom_id;
DROP INDEX IF EXISTS system.idx_email_job_created_by_id;
DROP INDEX IF EXISTS system.idx_email_job_provider_id;
DROP INDEX IF EXISTS system.idx_employment_record_employee_id;
DROP INDEX IF EXISTS system.idx_final_settlement_employee_id;
DROP INDEX IF EXISTS system.idx_final_settlement_handover_id;
DROP INDEX IF EXISTS system.idx_final_settlement_line_settlement_id;
ALTER TABLE system.final_settlement_line DROP CONSTRAINT IF EXISTS fk_final_settlement_line_settlement_id;
DROP INDEX IF EXISTS system.idx_generated_document_source_entity_id;
DROP INDEX IF EXISTS system.idx_generated_document_generated_by_id;
DROP INDEX IF EXISTS system.idx_inbox_event_id;
DROP INDEX IF EXISTS system.idx_inquiry_customer_id;
DROP INDEX IF EXISTS system.idx_inquiry_assigned_to_id;
DROP INDEX IF EXISTS system.idx_inquiry_note_inquiry_id;
ALTER TABLE system.inquiry_note DROP CONSTRAINT IF EXISTS fk_inquiry_note_inquiry_id;
DROP INDEX IF EXISTS system.idx_inquiry_note_author_id;
DROP INDEX IF EXISTS system.idx_integration_setting_updated_by_id;
DROP INDEX IF EXISTS system.idx_label_print_job_original_job_id;
DROP INDEX IF EXISTS system.idx_label_print_job_created_by_id;
DROP INDEX IF EXISTS system.idx_label_print_job_confirmed_by_id;
DROP INDEX IF EXISTS system.idx_legal_matter_assignee_id;
DROP INDEX IF EXISTS system.idx_legal_matter_created_by_id;
DROP INDEX IF EXISTS system.idx_legal_matter_event_matter_id;
ALTER TABLE system.legal_matter_event DROP CONSTRAINT IF EXISTS fk_legal_matter_event_matter_id;
DROP INDEX IF EXISTS system.idx_legal_matter_event_by_id;
DROP INDEX IF EXISTS system.idx_media_coverage_article_id;
DROP INDEX IF EXISTS system.idx_media_coverage_created_by_id;
DROP INDEX IF EXISTS system.idx_message_attachment_message_id;
ALTER TABLE system.message_attachment DROP CONSTRAINT IF EXISTS fk_message_attachment_message_id;
DROP INDEX IF EXISTS system.idx_minute_of_meeting_deal_id;
DROP INDEX IF EXISTS system.idx_minute_of_meeting_client_id;
DROP INDEX IF EXISTS system.idx_notification_user_id;
DROP INDEX IF EXISTS system.idx_notification_entity_id;
DROP INDEX IF EXISTS system.idx_official_letter_template_id;
DROP INDEX IF EXISTS system.idx_official_letter_employee_id;
DROP INDEX IF EXISTS system.idx_official_letter_created_by_id;
DROP INDEX IF EXISTS system.idx_official_letter_signer_id;
DROP INDEX IF EXISTS system.idx_package_content_package_id;
DROP INDEX IF EXISTS system.idx_package_content_product_id;
DROP INDEX IF EXISTS system.idx_payslip_payroll_item_id;
DROP INDEX IF EXISTS system.idx_payslip_employee_id;
DROP INDEX IF EXISTS system.idx_profile_change_request_user_id;
DROP INDEX IF EXISTS system.idx_profile_change_request_requested_by_id;
DROP INDEX IF EXISTS system.idx_profile_change_request_manager_id;
DROP INDEX IF EXISTS system.idx_project_department_id;
DROP INDEX IF EXISTS system.idx_project_owner_id;
DROP INDEX IF EXISTS system.idx_project_created_by_id;
DROP INDEX IF EXISTS system.idx_report_schedule_owner_id;
DROP INDEX IF EXISTS system.idx_request_assignment_inquiry_id;
ALTER TABLE system.request_assignment DROP CONSTRAINT IF EXISTS fk_request_assignment_inquiry_id;
DROP INDEX IF EXISTS system.idx_request_assignment_assigned_to_id;
DROP INDEX IF EXISTS system.idx_request_assignment_assigned_by_id;
DROP INDEX IF EXISTS system.idx_request_comment_inquiry_id;
ALTER TABLE system.request_comment DROP CONSTRAINT IF EXISTS fk_request_comment_inquiry_id;
DROP INDEX IF EXISTS system.idx_request_comment_author_id;
DROP INDEX IF EXISTS system.idx_request_event_inquiry_id;
ALTER TABLE system.request_event DROP CONSTRAINT IF EXISTS fk_request_event_inquiry_id;
DROP INDEX IF EXISTS system.idx_request_event_actor_id;
DROP INDEX IF EXISTS system.idx_review_client_id;
DROP INDEX IF EXISTS system.idx_route_sheet_driver_id;
DROP INDEX IF EXISTS system.idx_route_sheet_vehicle_id;
ALTER TABLE system.route_sheet DROP CONSTRAINT IF EXISTS fk_route_sheet_vehicle_id;
DROP INDEX IF EXISTS system.idx_route_sheet_created_by_id;
DROP INDEX IF EXISTS system.idx_serial_generation_product_id;
DROP INDEX IF EXISTS system.idx_serial_generation_location_id;
DROP INDEX IF EXISTS system.idx_serial_generation_created_by_id;
DROP INDEX IF EXISTS system.idx_signature_change_user_id;
DROP INDEX IF EXISTS system.idx_signature_change_reviewed_by_id;
DROP INDEX IF EXISTS system.idx_signature_policy_updated_by_id;
DROP INDEX IF EXISTS system.idx_signature_request_document_id;
DROP INDEX IF EXISTS system.idx_signature_request_created_by_id;
DROP INDEX IF EXISTS system.idx_upload_object_owner_id;
DROP INDEX IF EXISTS system.idx_warehouse_branch_id;
DROP INDEX IF EXISTS system.idx_wishlist_item_customer_id;
DROP INDEX IF EXISTS system.idx_wishlist_item_catalogue_item_id;
