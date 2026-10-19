-- Calendar events without their own colour follow the company accent instead of a fixed brand colour.
ALTER TABLE "CalendarEvent" ALTER COLUMN "color" DROP DEFAULT;
UPDATE "CalendarEvent" SET "color" = NULL WHERE upper("color") = '#09937F';
