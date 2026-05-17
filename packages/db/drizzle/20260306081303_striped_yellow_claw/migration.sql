CREATE SCHEMA "iiif";
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	"homepage" text,
	"plan" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"full_name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_anonymous" boolean DEFAULT false,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"slug" text
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iiif"."canvases" (
	"id" text PRIMARY KEY,
	"uri" text NOT NULL,
	"label" jsonb,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iiif"."canvases_images" (
	"canvas_id" text,
	"image_id" text,
	CONSTRAINT "canvases_images_pkey" PRIMARY KEY("canvas_id","image_id")
);
--> statement-breakpoint
CREATE TABLE "iiif"."images" (
	"id" text PRIMARY KEY,
	"uri" text NOT NULL,
	"domain" text GENERATED ALWAYS AS (((regexp_match("iiif"."images"."uri", '^(?:https?://)(?:[^@/
]+@)?([^:/
]+)'))[1])) STORED,
	"width" integer,
	"height" integer,
	"data" jsonb,
	"embedded" boolean DEFAULT true NOT NULL,
	"checksum" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iiif"."manifests" (
	"id" text PRIMARY KEY,
	"uri" text NOT NULL,
	"domain" text GENERATED ALWAYS AS (((regexp_match("iiif"."manifests"."uri", '^(?:https?://)(?:[^@/
]+@)?([^:/
]+)'))[1])) STORED,
	"label" jsonb,
	"data" jsonb,
	"checksum" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iiif"."manifests_canvases" (
	"manifest_id" text,
	"canvas_id" text,
	CONSTRAINT "manifests_canvases_pkey" PRIMARY KEY("manifest_id","canvas_id")
);
--> statement-breakpoint
CREATE TABLE "list_items" (
	"list_id" text NOT NULL,
	"map_id" text,
	"map_image_id" text,
	"map_checksum" text,
	"map_version" integer,
	"image_id" text,
	"canvas_id" text,
	"manifest_id" text,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "single_foreign_key" CHECK (
      (
        num_nonnulls("image_id", "canvas_id", "manifest_id") = 1
        AND
        "map_id" IS NULL AND "map_version" IS NULL AND "map_image_id" IS NULL AND "map_checksum" IS NULL
      ) OR (
        num_nonnulls("image_id", "canvas_id", "manifest_id") = 0
        AND
        "map_id" IS NOT NULL AND "map_version" IS NOT NULL AND "map_image_id" IS NOT NULL AND "map_checksum" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"deletable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maps" (
	"id" text,
	"image_id" text,
	"checksum" text,
	"image_checksum" text NOT NULL,
	"version" integer,
	"latest" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"data" jsonb NOT NULL,
	"resource_mask" geometry(Polygon),
	"geo_mask" geometry(Polygon,4326),
	"area" double precision GENERATED ALWAYS AS (CASE WHEN "maps"."geo_mask" IS NOT NULL THEN ST_Area(geography("maps"."geo_mask")) ELSE NULL END) STORED,
	"scale" double precision GENERATED ALWAYS AS (CASE WHEN ST_Area(geography("maps"."geo_mask")) > 0 THEN sqrt(ST_Area("maps"."resource_mask") / ST_Area(geography("maps"."geo_mask"))) ELSE NULL END) STORED,
	CONSTRAINT "maps_pkey" PRIMARY KEY("id","image_id","checksum","version")
);
--> statement-breakpoint
CREATE TABLE "organization_urls" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"url" text NOT NULL UNIQUE,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops" (
	"collection" text,
	"doc_id" text,
	"version" integer,
	"operation" jsonb NOT NULL,
	CONSTRAINT "ops_pkey" PRIMARY KEY("collection","doc_id","version")
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"collection" text,
	"doc_id" text,
	"doc_type" text NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_pkey" PRIMARY KEY("collection","doc_id")
);
--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "invitations_organizationId_idx" ON "invitations" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" ("email");--> statement-breakpoint
CREATE INDEX "members_organizationId_idx" ON "members" ("organization_id");--> statement-breakpoint
CREATE INDEX "members_userId_idx" ON "members" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "organizations" ("slug");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
CREATE INDEX "canvas_to_images_canvas_id_idx" ON "iiif"."canvases_images" ("canvas_id");--> statement-breakpoint
CREATE INDEX "canvas_to_images_image_id_idx" ON "iiif"."canvases_images" ("image_id");--> statement-breakpoint
CREATE INDEX "canvas_to_images_composite_idx" ON "iiif"."canvases_images" ("canvas_id","image_id");--> statement-breakpoint
CREATE INDEX "images_domain_index" ON "iiif"."images" ("domain");--> statement-breakpoint
CREATE INDEX "manifests_domain_index" ON "iiif"."manifests" ("domain");--> statement-breakpoint
CREATE INDEX "manifests_to_canvases_manifest_id_idx" ON "iiif"."manifests_canvases" ("manifest_id");--> statement-breakpoint
CREATE INDEX "manifests_to_canvases_canvas_id_idx" ON "iiif"."manifests_canvases" ("canvas_id");--> statement-breakpoint
CREATE INDEX "manifests_to_canvases_composite_idx" ON "iiif"."manifests_canvases" ("manifest_id","canvas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_map_uidx" ON "list_items" ("list_id","map_id","map_image_id","map_checksum","map_version") WHERE "map_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_image_uidx" ON "list_items" ("list_id","image_id") WHERE "image_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_canvas_uidx" ON "list_items" ("list_id","canvas_id") WHERE "canvas_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_manifest_uidx" ON "list_items" ("list_id","manifest_id") WHERE "manifest_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "maps_checksum_index" ON "maps" ("checksum");--> statement-breakpoint
CREATE INDEX "maps_image_id_index" ON "maps" ("image_id");--> statement-breakpoint
CREATE INDEX "maps_latest_index" ON "maps" ("latest");--> statement-breakpoint
CREATE INDEX "maps_updated_at_index" ON "maps" ("updated_at");--> statement-breakpoint
CREATE INDEX "maps_geo_mask_index" ON "maps" USING GIST ("geo_mask");--> statement-breakpoint
CREATE INDEX "organization_urls_organization_id_index" ON "organization_urls" ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_urls_url_index" ON "organization_urls" ("url");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "iiif"."canvases_images" ADD CONSTRAINT "canvases_images_canvas_id_canvases_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "iiif"."canvases"("id");--> statement-breakpoint
ALTER TABLE "iiif"."canvases_images" ADD CONSTRAINT "canvases_images_image_id_images_id_fkey" FOREIGN KEY ("image_id") REFERENCES "iiif"."images"("id");--> statement-breakpoint
ALTER TABLE "iiif"."manifests_canvases" ADD CONSTRAINT "manifests_canvases_manifest_id_manifests_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "iiif"."manifests"("id");--> statement-breakpoint
ALTER TABLE "iiif"."manifests_canvases" ADD CONSTRAINT "manifests_canvases_canvas_id_canvases_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "iiif"."canvases"("id");--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id");--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_image_id_images_id_fkey" FOREIGN KEY ("image_id") REFERENCES "iiif"."images"("id");--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_canvas_id_canvases_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "iiif"."canvases"("id");--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_manifest_id_manifests_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "iiif"."manifests"("id");--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_DOUrIXsmsloB_fkey" FOREIGN KEY ("map_id","map_image_id","map_checksum","map_version") REFERENCES "maps"("id","image_id","checksum","version");--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_image_id_images_id_fkey" FOREIGN KEY ("image_id") REFERENCES "iiif"."images"("id");--> statement-breakpoint
ALTER TABLE "organization_urls" ADD CONSTRAINT "organization_urls_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE VIEW "maps_latest" AS (select "id", "image_id", "checksum", "image_checksum", "version", "latest", "created_at", "updated_at", "data", "resource_mask", "geo_mask", "area", "scale" from "maps" where "maps"."latest" = true);