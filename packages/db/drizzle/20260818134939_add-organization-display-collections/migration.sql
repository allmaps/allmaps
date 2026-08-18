ALTER TABLE "organizations" ADD COLUMN "display_collections" boolean DEFAULT false NOT NULL;

UPDATE "organizations"
SET "display_collections" = true
WHERE "id" IN (
  '669272abb8d042cf',
  '0bcc9ac59b49a7f1',
  '4518d5c2330a4e2d',
  '90f909b0cba8e7ea',
  '419dacef25f44964',
  '7fb217695fea4770',
  'bc8296fa46cc4727'
);
