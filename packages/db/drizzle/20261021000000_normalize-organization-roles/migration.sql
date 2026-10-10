-- Normalize organization membership roles to owner or member, including legacy combined roles.
UPDATE "members"
SET "role" = CASE
  WHEN "role" ~ '(^|,)\s*(owner|admin)\s*(,|$)' THEN 'owner'
  ELSE 'member'
END
WHERE "role" NOT IN ('owner', 'member');
--> statement-breakpoint
UPDATE "invitations"
SET "role" = CASE
  WHEN "role" ~ '(^|,)\s*(owner|admin)\s*(,|$)' THEN 'owner'
  ELSE 'member'
END
WHERE "status" = 'pending' AND ("role" IS NULL OR "role" NOT IN ('owner', 'member'));
