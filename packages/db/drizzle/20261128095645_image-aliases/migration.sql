CREATE TABLE "iiif"."image_aliases" (
	"image_id" text PRIMARY KEY,
	"canonical_image_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iiif"."manifests_canvases" ADD COLUMN "image_service_uris" text[];--> statement-breakpoint
CREATE INDEX "image_aliases_canonical_image_id_index" ON "iiif"."image_aliases" ("canonical_image_id");--> statement-breakpoint
CREATE INDEX "manifests_canvases_service_uris_idx" ON "iiif"."manifests_canvases" USING gin ("image_service_uris");--> statement-breakpoint
ALTER TABLE "iiif"."image_aliases" ADD CONSTRAINT "image_aliases_canonical_image_id_images_id_fkey" FOREIGN KEY ("canonical_image_id") REFERENCES "iiif"."images"("id");