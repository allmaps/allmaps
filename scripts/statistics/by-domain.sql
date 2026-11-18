-- Read-only prototype: one row per source domain, independent of organizations.
-- Manifest ownership follows the manifest URI domain, not its images' domains.
-- Georeference proxy: a current, non-archived map with a geographic mask.
WITH image_counts AS (
  SELECT i.domain,
    count(*) AS images,
    count(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM iiif.canvases_images ci
      JOIN iiif.manifests_canvases mc ON mc.canvas_id = ci.canvas_id
      WHERE ci.image_id = i.id
    )) AS images_without_manifest,
    count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM maps m WHERE m.image_id = i.id
      AND m.latest AND NOT m.archived AND m.geo_mask IS NOT NULL
    )) AS georeferenced_images
  FROM iiif.images i WHERE NOT i.archived GROUP BY i.domain
), map_counts AS (
  SELECT i.domain, count(*) AS maps
  FROM maps m JOIN iiif.images i ON i.id = m.image_id
  WHERE m.latest AND NOT m.archived AND NOT i.archived GROUP BY i.domain
), manifest_counts AS (
  SELECT domain, count(*) AS manifests FROM iiif.manifests GROUP BY domain
), domains AS (
  SELECT domain FROM image_counts UNION SELECT domain FROM manifest_counts
)
SELECT d.domain, coalesce(i.images, 0) AS images,
  coalesce(m.maps, 0) AS maps, coalesce(f.manifests, 0) AS manifests,
  coalesce(i.images_without_manifest, 0) AS images_without_manifest,
  coalesce(i.georeferenced_images, 0) AS georeferenced_images
FROM domains d
LEFT JOIN image_counts i ON i.domain IS NOT DISTINCT FROM d.domain
LEFT JOIN map_counts m ON m.domain IS NOT DISTINCT FROM d.domain
LEFT JOIN manifest_counts f ON f.domain IS NOT DISTINCT FROM d.domain;
