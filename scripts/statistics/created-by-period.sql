-- $1: hour/day/week/month; $2: inclusive start; $3: exclusive end.
-- Counts creation of currently retained images/manifests, NOT historical stock.
-- Deliberately excludes map-version timestamps: saving one image republishes
-- sibling maps, so version creation is not automatically a new map or edit.
SELECT 'image' AS kind, domain,
  date_trunc($1, created_at AT TIME ZONE 'UTC') AS period, count(*) AS added
FROM iiif.images WHERE created_at >= $2 AND created_at < $3
GROUP BY domain, period
UNION ALL
SELECT 'manifest', domain,
  date_trunc($1, created_at AT TIME ZONE 'UTC') AS period, count(*)
FROM iiif.manifests WHERE created_at >= $2 AND created_at < $3
GROUP BY domain, period;
