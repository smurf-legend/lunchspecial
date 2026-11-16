-- Regions were only used by the removed /regions pages and the admin list grouping.
DROP INDEX IF EXISTS "Suburb_region_idx";
ALTER TABLE "Suburb" DROP COLUMN IF EXISTS "region";
