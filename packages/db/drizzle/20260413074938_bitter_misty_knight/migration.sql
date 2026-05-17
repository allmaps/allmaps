ALTER INDEX "maps_image_id_index" RENAME TO "maps_image_id_idx";--> statement-breakpoint
ALTER TABLE "organization_urls" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "organization_urls" ADD PRIMARY KEY ("organization_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "users_slug_uidx" ON "users" ("slug") WHERE "slug" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_slug_format" CHECK ("slug" ~ '^[a-z](?:[a-z0-9-]*[a-z0-9])?$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_slug_format" CHECK ("slug" IS NULL OR "slug" ~ '^[a-z](?:[a-z0-9-]*[a-z0-9])?$');