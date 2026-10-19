-- Who sees a calendar event, and personal calendar subscription links (e.g. Google Calendar) per user.

-- "private": the creator and the people chosen; "team": the creator's team and reporting line; "department": the
-- creator's department (plus any departments chosen); "company": everyone with calendar access; "custom": only the
-- people, departments and roles chosen. Managers above the creator see their team's events (except private ones).
ALTER TABLE "CalendarEvent" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'company';
ALTER TABLE "CalendarEvent" ADD COLUMN "audienceUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CalendarEvent" ADD COLUMN "audienceDepartmentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CalendarEvent" ADD COLUMN "audienceRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_visibility_check" CHECK ("visibility" IN ('private', 'team', 'department', 'company', 'custom'));
CREATE INDEX "CalendarEvent_createdById_idx" ON "CalendarEvent"("createdById");

-- A secret link a calendar app subscribes to; it lists only what the user may see. The token is stored hashed.
CREATE TABLE "CalendarFeedToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  -- Layers included in the feed: "own", "shared", "leave", "holidays", "sales", "finance", "hr", "payroll", "meetings", "requests"
  "layers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarFeedToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarFeedToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CalendarFeedToken_userId_key" ON "CalendarFeedToken"("userId");
CREATE UNIQUE INDEX "CalendarFeedToken_tokenHash_key" ON "CalendarFeedToken"("tokenHash");
