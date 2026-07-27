-- Enables trigram similarity search, used as a fuzzy fallback when an exact
-- keyword search (title/venueName contains) returns nothing — e.g. "mirnda
-- hotle" should still be able to suggest "Miranda Hotel".
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Special_title_trgm_idx" ON "Special" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Special_venueName_trgm_idx" ON "Special" USING GIN ("venueName" gin_trgm_ops);
