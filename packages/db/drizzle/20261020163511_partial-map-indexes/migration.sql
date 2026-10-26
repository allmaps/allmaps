-- Drizzle runs this migration in a transaction, so CREATE INDEX CONCURRENTLY
-- cannot be used here. Index creation blocks writes to maps; schedule accordingly.
CREATE INDEX "maps_latest_georeferenced_updated_at_idx" ON "maps" ("updated_at" DESC) WHERE "latest" = true AND "geo_mask" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "maps_latest_georeferenced_geo_mask_idx" ON "maps" USING gist ("geo_mask") WHERE "latest" = true AND "geo_mask" IS NOT NULL;--> statement-breakpoint
DROP INDEX "maps_updated_at_index";--> statement-breakpoint
DROP INDEX "maps_geo_mask_index";
