-- Anti-fraud attendance withdrawal tracking.
--
-- Adds a daily-total column on `attendance` plus a new
-- `attendance_withdrawals` table that records each open/closed
-- page-abandonment interval. Also adds a unique partial index on
-- `violations` so the daily `page_abandonment` violation cannot be
-- inserted twice under concurrent withdrawal-end requests.

ALTER TABLE "attendance"
  ADD COLUMN IF NOT EXISTS "total_withdrawn_minutes" integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "attendance_withdrawals" (
  "id" serial PRIMARY KEY,
  "attendance_id" integer NOT NULL
    REFERENCES "attendance"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL
    REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL DEFAULT CURRENT_DATE,
  "started_at" timestamp NOT NULL,
  "ended_at" timestamp,
  "duration_minutes" integer DEFAULT 0,
  "reason" varchar(50) DEFAULT 'page_abandonment',
  "previous_status" varchar(20),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_attendance_withdrawals_user_date"
  ON "attendance_withdrawals" ("user_id", "date");

CREATE INDEX IF NOT EXISTS "idx_attendance_withdrawals_attendance"
  ON "attendance_withdrawals" ("attendance_id");

-- At most one open (ended_at IS NULL) withdrawal per attendance row.
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_attendance_open_withdrawal"
  ON "attendance_withdrawals" ("attendance_id")
  WHERE "ended_at" IS NULL;

-- Defensive cleanup: collapse any pre-existing duplicate violations so the
-- new unique index can be created on databases that already contain them.
DELETE FROM "violations" a
  USING "violations" b
WHERE a."id" > b."id"
  AND a."employee_id" IS NOT DISTINCT FROM b."employee_id"
  AND a."violation_type" IS NOT DISTINCT FROM b."violation_type"
  AND a."date" IS NOT DISTINCT FROM b."date";

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_violation_per_day_per_type"
  ON "violations" ("employee_id", "violation_type", "date");
