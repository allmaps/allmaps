DROP VIEW "maps_latest";--> statement-breakpoint
ALTER TABLE "iiif"."images" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE VIEW "maps_latest" AS (select "id", "image_id", "checksum", "image_checksum", "version", "latest", "archived", "created_at", "updated_at", "data", "resource_mask", "geo_mask", "area", "scale" from "maps" where "maps"."latest" = true);