ALTER TABLE "PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_status_check_v2" CHECK (
    "status" IN (
        'created',
        'pending',
        'paid',
        'failed',
        'expired',
        'review'
    )
);

ALTER TABLE "PaymentAttempt"
DROP CONSTRAINT "PaymentAttempt_status_check";

ALTER TABLE "PaymentAttempt"
RENAME CONSTRAINT "PaymentAttempt_status_check_v2" TO "PaymentAttempt_status_check";