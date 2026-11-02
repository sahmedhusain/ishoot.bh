-- In-app notifications move to the notify service (docs/adr/0012). Producers still write "Notification" rows in
-- their own transactions; the admin hands each row to notify once and marks it here. Every existing row is pending,
-- so the first hand-over moves the whole history with its read and hidden state.
ALTER TABLE "Notification" ADD COLUMN "handedOverAt" TIMESTAMP(3);

CREATE INDEX "Notification_handedOverAt_createdAt_idx" ON "Notification"("handedOverAt", "createdAt");
