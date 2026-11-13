CREATE TABLE "statistics_daily" (
	"domain" text,
	"day" date,
	"images_added" bigint DEFAULT 0 NOT NULL,
	"maps_added" bigint DEFAULT 0 NOT NULL,
	"manifests_added" bigint DEFAULT 0 NOT NULL,
	"images_first_georeferenced" bigint DEFAULT 0 NOT NULL,
	"images" bigint,
	"maps" bigint,
	"manifests" bigint,
	"images_without_manifest" bigint,
	"georeferenced_images" bigint,
	"snapshot_at" timestamp with time zone,
	"activity_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statistics_daily_pkey" PRIMARY KEY("domain","day")
);
--> statement-breakpoint
CREATE INDEX "statistics_daily_day_idx" ON "statistics_daily" ("day");