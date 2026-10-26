-- Requests created before sequence numbering carry a random id as their reference (e.g. cmvekfwmi0009k4itg43ycgda).
-- Give each one a proper number: SR, INQ, RFQ (quote request), CMP (complaint) or SUG (suggestion), in order of creation.
WITH bad AS (
  SELECT id, "createdAt",
    CASE
      WHEN "requestType" = 'SR' THEN 'SR'
      WHEN intent = 'complaint' THEN 'CMP'
      WHEN intent = 'suggestion' THEN 'SUG'
      WHEN "requestType" = 'quote_request' OR intent = 'quote_request' THEN 'RFQ'
      ELSE 'INQ'
    END AS prefix,
    EXTRACT(YEAR FROM "createdAt")::int AS yr
  FROM "Inquiry"
  WHERE reference !~ '^(SR|CR|INQ|RFQ|CMP|SUG)-[0-9]{4}-[0-9]{6}$'
), numbered AS (
  SELECT b.id, b.prefix, b.yr,
    COALESCE(s."lastNumber", 0) + ROW_NUMBER() OVER (PARTITION BY b.prefix, b.yr ORDER BY b."createdAt", b.id) AS n
  FROM bad b LEFT JOIN "ReferenceSequence" s ON s.id = b.prefix || '_' || b.yr
), applied AS (
  UPDATE "Inquiry" i SET reference = n.prefix || '-' || n.yr || '-' || LPAD(n.n::text, 6, '0')
  FROM numbered n WHERE i.id = n.id
  RETURNING n.prefix, n.yr, n.n
)
INSERT INTO "ReferenceSequence" (id, prefix, year, "lastNumber", "updatedAt")
SELECT prefix || '_' || yr, prefix, yr, MAX(n)::int, NOW() FROM applied GROUP BY prefix, yr
ON CONFLICT (id) DO UPDATE SET "lastNumber" = EXCLUDED."lastNumber", "updatedAt" = NOW();