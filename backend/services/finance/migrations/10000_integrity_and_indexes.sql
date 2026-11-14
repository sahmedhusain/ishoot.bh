-- +goose Up
ALTER TABLE finance.payment_webhook_event ALTER COLUMN gateway SET NOT NULL;
ALTER TABLE finance.payment_webhook_event ALTER COLUMN event_id SET NOT NULL;
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'finance.payment_webhook_event'::regclass AND contype = 'p') THEN
        DELETE FROM finance.payment_webhook_event a USING finance.payment_webhook_event b WHERE a.ctid < b.ctid AND a.gateway = b.gateway AND a.event_id = b.event_id;
        ALTER TABLE finance.payment_webhook_event ADD CONSTRAINT payment_webhook_event_pkey PRIMARY KEY (gateway, event_id);
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_agency_invoice_agency_id ON finance.agency_invoice (agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_invoice_expense_id ON finance.agency_invoice (expense_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agency_invoice_expense_id' AND conrelid = 'finance.agency_invoice'::regclass) THEN
        UPDATE finance.agency_invoice SET expense_id = NULL WHERE expense_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.expense p WHERE p.id = finance.agency_invoice.expense_id);
        ALTER TABLE finance.agency_invoice ADD CONSTRAINT fk_agency_invoice_expense_id FOREIGN KEY (expense_id) REFERENCES finance.expense(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_agency_invoice_created_by_id ON finance.agency_invoice (created_by_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_register_id ON finance.cash_drawer (register_id);
CREATE INDEX IF NOT EXISTS idx_cashier_session_register_id ON finance.cashier_session (register_id);
CREATE INDEX IF NOT EXISTS idx_cashier_session_drawer_id ON finance.cashier_session (drawer_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cashier_session_drawer_id' AND conrelid = 'finance.cashier_session'::regclass) THEN
        UPDATE finance.cashier_session SET drawer_id = NULL WHERE drawer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.cash_drawer p WHERE p.id = finance.cashier_session.drawer_id);
        ALTER TABLE finance.cashier_session ADD CONSTRAINT fk_cashier_session_drawer_id FOREIGN KEY (drawer_id) REFERENCES finance.cash_drawer(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_cashier_session_cashier_id ON finance.cashier_session (cashier_id);
CREATE INDEX IF NOT EXISTS idx_cashier_session_shift_id ON finance.cashier_session (shift_id);
CREATE INDEX IF NOT EXISTS idx_commission_payout_user_id ON finance.commission_payout (user_id);
CREATE INDEX IF NOT EXISTS idx_commission_payout_expense_id ON finance.commission_payout (expense_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_commission_payout_expense_id' AND conrelid = 'finance.commission_payout'::regclass) THEN
        UPDATE finance.commission_payout SET expense_id = NULL WHERE expense_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.expense p WHERE p.id = finance.commission_payout.expense_id);
        ALTER TABLE finance.commission_payout ADD CONSTRAINT fk_commission_payout_expense_id FOREIGN KEY (expense_id) REFERENCES finance.expense(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_commission_payout_payroll_item_id ON finance.commission_payout (payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_commission_payout_recorded_by_id ON finance.commission_payout (recorded_by_id);
CREATE INDEX IF NOT EXISTS idx_commission_snapshot_order_id ON finance.commission_snapshot (order_id);
CREATE INDEX IF NOT EXISTS idx_commission_snapshot_order_line_id ON finance.commission_snapshot (order_line_id);
CREATE INDEX IF NOT EXISTS idx_commission_snapshot_attributed_user_id ON finance.commission_snapshot (attributed_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_snapshot_rule_id ON finance.commission_snapshot (rule_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_commission_snapshot_rule_id' AND conrelid = 'finance.commission_snapshot'::regclass) THEN
        UPDATE finance.commission_snapshot SET rule_id = NULL WHERE rule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.commission_rule p WHERE p.id = finance.commission_snapshot.rule_id);
        ALTER TABLE finance.commission_snapshot ADD CONSTRAINT fk_commission_snapshot_rule_id FOREIGN KEY (rule_id) REFERENCES finance.commission_rule(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_commission_snapshot_reversal_of_id ON finance.commission_snapshot (reversal_of_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_commission_snapshot_reversal_of_id' AND conrelid = 'finance.commission_snapshot'::regclass) THEN
        UPDATE finance.commission_snapshot SET reversal_of_id = NULL WHERE reversal_of_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.commission_snapshot p WHERE p.id = finance.commission_snapshot.reversal_of_id);
        ALTER TABLE finance.commission_snapshot ADD CONSTRAINT fk_commission_snapshot_reversal_of_id FOREIGN KEY (reversal_of_id) REFERENCES finance.commission_snapshot(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_commission_snapshot_created_by_id ON finance.commission_snapshot (created_by_id);
CREATE INDEX IF NOT EXISTS idx_document_tax_invoice_id ON finance.document_tax (invoice_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_tax_invoice_id' AND conrelid = 'finance.document_tax'::regclass) THEN
        UPDATE finance.document_tax SET invoice_id = NULL WHERE invoice_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.invoice p WHERE p.id = finance.document_tax.invoice_id);
        ALTER TABLE finance.document_tax ADD CONSTRAINT fk_document_tax_invoice_id FOREIGN KEY (invoice_id) REFERENCES finance.invoice(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_document_tax_quotation_id ON finance.document_tax (quotation_id);
CREATE INDEX IF NOT EXISTS idx_document_tax_tax_rate_id ON finance.document_tax (tax_rate_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_tax_tax_rate_id' AND conrelid = 'finance.document_tax'::regclass) THEN
        UPDATE finance.document_tax SET tax_rate_id = NULL WHERE tax_rate_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.tax_rate p WHERE p.id = finance.document_tax.tax_rate_id);
        ALTER TABLE finance.document_tax ADD CONSTRAINT fk_document_tax_tax_rate_id FOREIGN KEY (tax_rate_id) REFERENCES finance.tax_rate(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_expense_created_by ON finance.expense (created_by);
CREATE INDEX IF NOT EXISTS idx_expense_approved_by ON finance.expense (approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_deal_id ON finance.expense (deal_id);
CREATE INDEX IF NOT EXISTS idx_expense_client_id ON finance.expense (client_id);
CREATE INDEX IF NOT EXISTS idx_expense_created_by_id ON finance.expense (created_by_id);
CREATE INDEX IF NOT EXISTS idx_expense_recurring_expense_id ON finance.expense (recurring_expense_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expense_recurring_expense_id' AND conrelid = 'finance.expense'::regclass) THEN
        UPDATE finance.expense SET recurring_expense_id = NULL WHERE recurring_expense_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.recurring_expense p WHERE p.id = finance.expense.recurring_expense_id);
        ALTER TABLE finance.expense ADD CONSTRAINT fk_expense_recurring_expense_id FOREIGN KEY (recurring_expense_id) REFERENCES finance.recurring_expense(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_expense_claim_claimant_id ON finance.expense_claim (claimant_id);
CREATE INDEX IF NOT EXISTS idx_expense_claim_category_id ON finance.expense_claim (category_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expense_claim_category_id' AND conrelid = 'finance.expense_claim'::regclass) THEN
        UPDATE finance.expense_claim SET category_id = NULL WHERE category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.expense_category p WHERE p.id = finance.expense_claim.category_id);
        ALTER TABLE finance.expense_claim ADD CONSTRAINT fk_expense_claim_category_id FOREIGN KEY (category_id) REFERENCES finance.expense_category(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_expense_claim_deal_id ON finance.expense_claim (deal_id);
CREATE INDEX IF NOT EXISTS idx_expense_claim_invoice_id ON finance.expense_claim (invoice_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expense_claim_invoice_id' AND conrelid = 'finance.expense_claim'::regclass) THEN
        UPDATE finance.expense_claim SET invoice_id = NULL WHERE invoice_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.invoice p WHERE p.id = finance.expense_claim.invoice_id);
        ALTER TABLE finance.expense_claim ADD CONSTRAINT fk_expense_claim_invoice_id FOREIGN KEY (invoice_id) REFERENCES finance.invoice(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_expense_claim_calendar_event_id ON finance.expense_claim (calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_expense_claim_scheduled_by_id ON finance.expense_claim (scheduled_by_id);
CREATE INDEX IF NOT EXISTS idx_expense_claim_paid_by_id ON finance.expense_claim (paid_by_id);
CREATE INDEX IF NOT EXISTS idx_expense_claim_expense_id ON finance.expense_claim (expense_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expense_claim_expense_id' AND conrelid = 'finance.expense_claim'::regclass) THEN
        UPDATE finance.expense_claim SET expense_id = NULL WHERE expense_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.expense p WHERE p.id = finance.expense_claim.expense_id);
        ALTER TABLE finance.expense_claim ADD CONSTRAINT fk_expense_claim_expense_id FOREIGN KEY (expense_id) REFERENCES finance.expense(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON finance.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_invoice_quotation_id ON finance.invoice (quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoice_contact_id ON finance.invoice (contact_id);
CREATE INDEX IF NOT EXISTS idx_invoice_deal_id ON finance.invoice (deal_id);
CREATE INDEX IF NOT EXISTS idx_invoice_client_id ON finance.invoice (client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_created_by_id ON finance.invoice (created_by_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sales_owner_id ON finance.invoice (sales_owner_id);
CREATE INDEX IF NOT EXISTS idx_invoice_signed_by_id ON finance.invoice (signed_by_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_item_invoice_id ON finance.invoice_line_item (invoice_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoice_line_item_invoice_id' AND conrelid = 'finance.invoice_line_item'::regclass) THEN
        DELETE FROM finance.invoice_line_item WHERE invoice_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.invoice p WHERE p.id = finance.invoice_line_item.invoice_id);
        ALTER TABLE finance.invoice_line_item ADD CONSTRAINT fk_invoice_line_item_invoice_id FOREIGN KEY (invoice_id) REFERENCES finance.invoice(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_invoice_line_item_service_id ON finance.invoice_line_item (service_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_period_id ON finance.journal_entry (period_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_branch_id ON finance.journal_entry (branch_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_reversal_of_id ON finance.journal_entry (reversal_of_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_journal_entry_reversal_of_id' AND conrelid = 'finance.journal_entry'::regclass) THEN
        UPDATE finance.journal_entry SET reversal_of_id = NULL WHERE reversal_of_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.journal_entry p WHERE p.id = finance.journal_entry.reversal_of_id);
        ALTER TABLE finance.journal_entry ADD CONSTRAINT fk_journal_entry_reversal_of_id FOREIGN KEY (reversal_of_id) REFERENCES finance.journal_entry(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_journal_entry_created_by_id ON finance.journal_entry (created_by_id);
CREATE INDEX IF NOT EXISTS idx_journal_line_entry_id ON finance.journal_line (entry_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_journal_line_entry_id' AND conrelid = 'finance.journal_line'::regclass) THEN
        DELETE FROM finance.journal_line WHERE entry_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.journal_entry p WHERE p.id = finance.journal_line.entry_id);
        ALTER TABLE finance.journal_line ADD CONSTRAINT fk_journal_line_entry_id FOREIGN KEY (entry_id) REFERENCES finance.journal_entry(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_journal_line_account_id ON finance.journal_line (account_id);
CREATE INDEX IF NOT EXISTS idx_payment_contact_id ON finance.payment (contact_id);
CREATE INDEX IF NOT EXISTS idx_payment_created_by_id ON finance.payment (created_by_id);
CREATE INDEX IF NOT EXISTS idx_payment_signed_by_id ON finance.payment (signed_by_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocation_payment_id ON finance.payment_allocation (payment_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_allocation_payment_id' AND conrelid = 'finance.payment_allocation'::regclass) THEN
        DELETE FROM finance.payment_allocation WHERE payment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.payment p WHERE p.id = finance.payment_allocation.payment_id);
        ALTER TABLE finance.payment_allocation ADD CONSTRAINT fk_payment_allocation_payment_id FOREIGN KEY (payment_id) REFERENCES finance.payment(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_payment_allocation_invoice_id ON finance.payment_allocation (invoice_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_allocation_invoice_id' AND conrelid = 'finance.payment_allocation'::regclass) THEN
        DELETE FROM finance.payment_allocation WHERE invoice_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.invoice p WHERE p.id = finance.payment_allocation.invoice_id);
        ALTER TABLE finance.payment_allocation ADD CONSTRAINT fk_payment_allocation_invoice_id FOREIGN KEY (invoice_id) REFERENCES finance.invoice(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_payment_attempt_order_id ON finance.payment_attempt (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempt_session_id ON finance.payment_attempt (session_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_attempt_session_id' AND conrelid = 'finance.payment_attempt'::regclass) THEN
        UPDATE finance.payment_attempt SET session_id = NULL WHERE session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.cashier_session p WHERE p.id = finance.payment_attempt.session_id);
        ALTER TABLE finance.payment_attempt ADD CONSTRAINT fk_payment_attempt_session_id FOREIGN KEY (session_id) REFERENCES finance.cashier_session(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_payment_attempt_gateway_payment_id ON finance.payment_attempt (gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempt_payment_id ON finance.payment_attempt (payment_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_attempt_payment_id' AND conrelid = 'finance.payment_attempt'::regclass) THEN
        DELETE FROM finance.payment_attempt WHERE payment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.payment p WHERE p.id = finance.payment_attempt.payment_id);
        ALTER TABLE finance.payment_attempt ADD CONSTRAINT fk_payment_attempt_payment_id FOREIGN KEY (payment_id) REFERENCES finance.payment(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_payment_collection_branch_id ON finance.payment_collection (branch_id);
CREATE INDEX IF NOT EXISTS idx_payment_collection_session_id ON finance.payment_collection (session_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_collection_session_id' AND conrelid = 'finance.payment_collection'::regclass) THEN
        UPDATE finance.payment_collection SET session_id = NULL WHERE session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.cashier_session p WHERE p.id = finance.payment_collection.session_id);
        ALTER TABLE finance.payment_collection ADD CONSTRAINT fk_payment_collection_session_id FOREIGN KEY (session_id) REFERENCES finance.cashier_session(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_payment_collection_order_id ON finance.payment_collection (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_collection_invoice_id ON finance.payment_collection (invoice_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_collection_invoice_id' AND conrelid = 'finance.payment_collection'::regclass) THEN
        UPDATE finance.payment_collection SET invoice_id = NULL WHERE invoice_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.invoice p WHERE p.id = finance.payment_collection.invoice_id);
        ALTER TABLE finance.payment_collection ADD CONSTRAINT fk_payment_collection_invoice_id FOREIGN KEY (invoice_id) REFERENCES finance.invoice(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_payment_collection_collected_by_id ON finance.payment_collection (collected_by_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_config_branch_id ON finance.payment_method_config (branch_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_event_event_id ON finance.payment_webhook_event (event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_event_attempt_id ON finance.payment_webhook_event (attempt_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_webhook_event_attempt_id' AND conrelid = 'finance.payment_webhook_event'::regclass) THEN
        UPDATE finance.payment_webhook_event SET attempt_id = NULL WHERE attempt_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.payment_attempt p WHERE p.id = finance.payment_webhook_event.attempt_id);
        ALTER TABLE finance.payment_webhook_event ADD CONSTRAINT fk_payment_webhook_event_attempt_id FOREIGN KEY (attempt_id) REFERENCES finance.payment_attempt(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_recurring_expense_category_id ON finance.recurring_expense (category_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recurring_expense_category_id' AND conrelid = 'finance.recurring_expense'::regclass) THEN
        UPDATE finance.recurring_expense SET category_id = NULL WHERE category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.expense_category p WHERE p.id = finance.recurring_expense.category_id);
        ALTER TABLE finance.recurring_expense ADD CONSTRAINT fk_recurring_expense_category_id FOREIGN KEY (category_id) REFERENCES finance.expense_category(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_recurring_expense_created_by_id ON finance.recurring_expense (created_by_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_supplier_id ON finance.supplier_bill (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_purchase_order_id ON finance.supplier_bill (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_expense_id ON finance.supplier_bill (expense_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplier_bill_expense_id' AND conrelid = 'finance.supplier_bill'::regclass) THEN
        UPDATE finance.supplier_bill SET expense_id = NULL WHERE expense_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.expense p WHERE p.id = finance.supplier_bill.expense_id);
        ALTER TABLE finance.supplier_bill ADD CONSTRAINT fk_supplier_bill_expense_id FOREIGN KEY (expense_id) REFERENCES finance.expense(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_supplier_bill_created_by_id ON finance.supplier_bill (created_by_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_approved_by_id ON finance.supplier_bill (approved_by_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_line_bill_id ON finance.supplier_bill_line (bill_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplier_bill_line_bill_id' AND conrelid = 'finance.supplier_bill_line'::regclass) THEN
        DELETE FROM finance.supplier_bill_line WHERE bill_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.supplier_bill p WHERE p.id = finance.supplier_bill_line.bill_id);
        ALTER TABLE finance.supplier_bill_line ADD CONSTRAINT fk_supplier_bill_line_bill_id FOREIGN KEY (bill_id) REFERENCES finance.supplier_bill(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_supplier_bill_line_order_line_id ON finance.supplier_bill_line (order_line_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_bill_id ON finance.supplier_payment (bill_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplier_payment_bill_id' AND conrelid = 'finance.supplier_payment'::regclass) THEN
        DELETE FROM finance.supplier_payment WHERE bill_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance.supplier_bill p WHERE p.id = finance.supplier_payment.bill_id);
        ALTER TABLE finance.supplier_payment ADD CONSTRAINT fk_supplier_payment_bill_id FOREIGN KEY (bill_id) REFERENCES finance.supplier_bill(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_supplier_payment_created_by_id ON finance.supplier_payment (created_by_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status_due ON finance.invoice (status, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_contact_created ON finance.invoice (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_date_desc ON finance.payment (payment_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_allocation_pair ON finance.payment_allocation (payment_id, invoice_id);

-- +goose Down
DROP INDEX IF EXISTS finance.idx_agency_invoice_agency_id;
DROP INDEX IF EXISTS finance.idx_agency_invoice_expense_id;
ALTER TABLE finance.agency_invoice DROP CONSTRAINT IF EXISTS fk_agency_invoice_expense_id;
DROP INDEX IF EXISTS finance.idx_agency_invoice_created_by_id;
DROP INDEX IF EXISTS finance.idx_cash_drawer_register_id;
DROP INDEX IF EXISTS finance.idx_cashier_session_register_id;
DROP INDEX IF EXISTS finance.idx_cashier_session_drawer_id;
ALTER TABLE finance.cashier_session DROP CONSTRAINT IF EXISTS fk_cashier_session_drawer_id;
DROP INDEX IF EXISTS finance.idx_cashier_session_cashier_id;
DROP INDEX IF EXISTS finance.idx_cashier_session_shift_id;
DROP INDEX IF EXISTS finance.idx_commission_payout_user_id;
DROP INDEX IF EXISTS finance.idx_commission_payout_expense_id;
ALTER TABLE finance.commission_payout DROP CONSTRAINT IF EXISTS fk_commission_payout_expense_id;
DROP INDEX IF EXISTS finance.idx_commission_payout_payroll_item_id;
DROP INDEX IF EXISTS finance.idx_commission_payout_recorded_by_id;
DROP INDEX IF EXISTS finance.idx_commission_snapshot_order_id;
DROP INDEX IF EXISTS finance.idx_commission_snapshot_order_line_id;
DROP INDEX IF EXISTS finance.idx_commission_snapshot_attributed_user_id;
DROP INDEX IF EXISTS finance.idx_commission_snapshot_rule_id;
ALTER TABLE finance.commission_snapshot DROP CONSTRAINT IF EXISTS fk_commission_snapshot_rule_id;
DROP INDEX IF EXISTS finance.idx_commission_snapshot_reversal_of_id;
ALTER TABLE finance.commission_snapshot DROP CONSTRAINT IF EXISTS fk_commission_snapshot_reversal_of_id;
DROP INDEX IF EXISTS finance.idx_commission_snapshot_created_by_id;
DROP INDEX IF EXISTS finance.idx_document_tax_invoice_id;
ALTER TABLE finance.document_tax DROP CONSTRAINT IF EXISTS fk_document_tax_invoice_id;
DROP INDEX IF EXISTS finance.idx_document_tax_quotation_id;
DROP INDEX IF EXISTS finance.idx_document_tax_tax_rate_id;
ALTER TABLE finance.document_tax DROP CONSTRAINT IF EXISTS fk_document_tax_tax_rate_id;
DROP INDEX IF EXISTS finance.idx_expense_created_by;
DROP INDEX IF EXISTS finance.idx_expense_approved_by;
DROP INDEX IF EXISTS finance.idx_expense_deal_id;
DROP INDEX IF EXISTS finance.idx_expense_client_id;
DROP INDEX IF EXISTS finance.idx_expense_created_by_id;
DROP INDEX IF EXISTS finance.idx_expense_recurring_expense_id;
ALTER TABLE finance.expense DROP CONSTRAINT IF EXISTS fk_expense_recurring_expense_id;
DROP INDEX IF EXISTS finance.idx_expense_claim_claimant_id;
DROP INDEX IF EXISTS finance.idx_expense_claim_category_id;
ALTER TABLE finance.expense_claim DROP CONSTRAINT IF EXISTS fk_expense_claim_category_id;
DROP INDEX IF EXISTS finance.idx_expense_claim_deal_id;
DROP INDEX IF EXISTS finance.idx_expense_claim_invoice_id;
ALTER TABLE finance.expense_claim DROP CONSTRAINT IF EXISTS fk_expense_claim_invoice_id;
DROP INDEX IF EXISTS finance.idx_expense_claim_calendar_event_id;
DROP INDEX IF EXISTS finance.idx_expense_claim_scheduled_by_id;
DROP INDEX IF EXISTS finance.idx_expense_claim_paid_by_id;
DROP INDEX IF EXISTS finance.idx_expense_claim_expense_id;
ALTER TABLE finance.expense_claim DROP CONSTRAINT IF EXISTS fk_expense_claim_expense_id;
DROP INDEX IF EXISTS finance.idx_inbox_event_id;
DROP INDEX IF EXISTS finance.idx_invoice_quotation_id;
DROP INDEX IF EXISTS finance.idx_invoice_contact_id;
DROP INDEX IF EXISTS finance.idx_invoice_deal_id;
DROP INDEX IF EXISTS finance.idx_invoice_client_id;
DROP INDEX IF EXISTS finance.idx_invoice_created_by_id;
DROP INDEX IF EXISTS finance.idx_invoice_sales_owner_id;
DROP INDEX IF EXISTS finance.idx_invoice_signed_by_id;
DROP INDEX IF EXISTS finance.idx_invoice_line_item_invoice_id;
ALTER TABLE finance.invoice_line_item DROP CONSTRAINT IF EXISTS fk_invoice_line_item_invoice_id;
DROP INDEX IF EXISTS finance.idx_invoice_line_item_service_id;
DROP INDEX IF EXISTS finance.idx_journal_entry_period_id;
DROP INDEX IF EXISTS finance.idx_journal_entry_branch_id;
DROP INDEX IF EXISTS finance.idx_journal_entry_reversal_of_id;
ALTER TABLE finance.journal_entry DROP CONSTRAINT IF EXISTS fk_journal_entry_reversal_of_id;
DROP INDEX IF EXISTS finance.idx_journal_entry_created_by_id;
DROP INDEX IF EXISTS finance.idx_journal_line_entry_id;
ALTER TABLE finance.journal_line DROP CONSTRAINT IF EXISTS fk_journal_line_entry_id;
DROP INDEX IF EXISTS finance.idx_journal_line_account_id;
DROP INDEX IF EXISTS finance.idx_payment_contact_id;
DROP INDEX IF EXISTS finance.idx_payment_created_by_id;
DROP INDEX IF EXISTS finance.idx_payment_signed_by_id;
DROP INDEX IF EXISTS finance.idx_payment_allocation_payment_id;
ALTER TABLE finance.payment_allocation DROP CONSTRAINT IF EXISTS fk_payment_allocation_payment_id;
DROP INDEX IF EXISTS finance.idx_payment_allocation_invoice_id;
ALTER TABLE finance.payment_allocation DROP CONSTRAINT IF EXISTS fk_payment_allocation_invoice_id;
DROP INDEX IF EXISTS finance.idx_payment_attempt_order_id;
DROP INDEX IF EXISTS finance.idx_payment_attempt_session_id;
ALTER TABLE finance.payment_attempt DROP CONSTRAINT IF EXISTS fk_payment_attempt_session_id;
DROP INDEX IF EXISTS finance.idx_payment_attempt_gateway_payment_id;
DROP INDEX IF EXISTS finance.idx_payment_attempt_payment_id;
ALTER TABLE finance.payment_attempt DROP CONSTRAINT IF EXISTS fk_payment_attempt_payment_id;
DROP INDEX IF EXISTS finance.idx_payment_collection_branch_id;
DROP INDEX IF EXISTS finance.idx_payment_collection_session_id;
ALTER TABLE finance.payment_collection DROP CONSTRAINT IF EXISTS fk_payment_collection_session_id;
DROP INDEX IF EXISTS finance.idx_payment_collection_order_id;
DROP INDEX IF EXISTS finance.idx_payment_collection_invoice_id;
ALTER TABLE finance.payment_collection DROP CONSTRAINT IF EXISTS fk_payment_collection_invoice_id;
DROP INDEX IF EXISTS finance.idx_payment_collection_collected_by_id;
DROP INDEX IF EXISTS finance.idx_payment_method_config_branch_id;
DROP INDEX IF EXISTS finance.idx_payment_webhook_event_event_id;
DROP INDEX IF EXISTS finance.idx_payment_webhook_event_attempt_id;
ALTER TABLE finance.payment_webhook_event DROP CONSTRAINT IF EXISTS fk_payment_webhook_event_attempt_id;
DROP INDEX IF EXISTS finance.idx_recurring_expense_category_id;
ALTER TABLE finance.recurring_expense DROP CONSTRAINT IF EXISTS fk_recurring_expense_category_id;
DROP INDEX IF EXISTS finance.idx_recurring_expense_created_by_id;
DROP INDEX IF EXISTS finance.idx_supplier_bill_supplier_id;
DROP INDEX IF EXISTS finance.idx_supplier_bill_purchase_order_id;
DROP INDEX IF EXISTS finance.idx_supplier_bill_expense_id;
ALTER TABLE finance.supplier_bill DROP CONSTRAINT IF EXISTS fk_supplier_bill_expense_id;
DROP INDEX IF EXISTS finance.idx_supplier_bill_created_by_id;
DROP INDEX IF EXISTS finance.idx_supplier_bill_approved_by_id;
DROP INDEX IF EXISTS finance.idx_supplier_bill_line_bill_id;
ALTER TABLE finance.supplier_bill_line DROP CONSTRAINT IF EXISTS fk_supplier_bill_line_bill_id;
DROP INDEX IF EXISTS finance.idx_supplier_bill_line_order_line_id;
DROP INDEX IF EXISTS finance.idx_supplier_payment_bill_id;
ALTER TABLE finance.supplier_payment DROP CONSTRAINT IF EXISTS fk_supplier_payment_bill_id;
DROP INDEX IF EXISTS finance.idx_supplier_payment_created_by_id;
DROP INDEX IF EXISTS finance.idx_invoice_status_due;
DROP INDEX IF EXISTS finance.idx_invoice_contact_created;
DROP INDEX IF EXISTS finance.idx_payment_date_desc;
DROP INDEX IF EXISTS finance.uq_payment_allocation_pair;
