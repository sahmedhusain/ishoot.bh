-- +goose Up
DROP TABLE IF EXISTS system.inquiry_note CASCADE;
DROP TABLE IF EXISTS system.inquiry CASCADE;
DROP TABLE IF EXISTS system.calendar_event CASCADE;
DROP TABLE IF EXISTS system.notification CASCADE;
DROP TABLE IF EXISTS system.attachment CASCADE;
DROP TABLE IF EXISTS system.contract CASCADE;
DROP TABLE IF EXISTS system.minute_of_meeting CASCADE;
DROP TABLE IF EXISTS system.review CASCADE;
DROP TABLE IF EXISTS system.faq CASCADE;
DROP TABLE IF EXISTS system.statistic CASCADE;
DROP TABLE IF EXISTS system.upload_object CASCADE;
DROP TABLE IF EXISTS system.approval_decision CASCADE;
DROP TABLE IF EXISTS system.approval_request CASCADE;
DROP TABLE IF EXISTS system.bank_settlement CASCADE;
DROP TABLE IF EXISTS system.signature_request CASCADE;
DROP TABLE IF EXISTS system.official_letter CASCADE;
DROP TABLE IF EXISTS system.letter_template CASCADE;
DROP TABLE IF EXISTS system.warehouse CASCADE;
DROP TABLE IF EXISTS system.cod_settlement CASCADE;
DROP TABLE IF EXISTS system.route_sheet CASCADE;
DROP TABLE IF EXISTS system.vehicle CASCADE;
DROP TABLE IF EXISTS system.courier_agency CASCADE;

-- +goose Down
SELECT 1;
