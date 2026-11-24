CREATE TABLE "iiif"."image_aliases" (
	"image_id" text PRIMARY KEY,
	"canonical_image_id" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "image_aliases_canonical_image_id_index" ON "iiif"."image_aliases" ("canonical_image_id");--> statement-breakpoint
ALTER TABLE "iiif"."image_aliases" ADD CONSTRAINT "image_aliases_canonical_image_id_images_id_fkey" FOREIGN KEY ("canonical_image_id") REFERENCES "iiif"."images"("id");