ALTER TABLE "iiif"."canvases" ADD COLUMN "domain" text GENERATED ALWAYS AS (((regexp_match("iiif"."canvases"."uri", '^(?:https?://)(?:[^@/
]+@)?([^:/
]+)'))[1])) STORED;
