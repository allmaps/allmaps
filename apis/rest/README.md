# Allmaps REST API

See [Hyperdrive setup](../HYPERDRIVE.md) for database connections and local
development, and [cache policies](../CACHE-POLICIES.md) for the endpoint audit.

## Archiving maps and images

Allmaps admins can archive resources with `DELETE /maps/:mapId` and
`DELETE /images/:imageId`. Archiving an image also archives all its maps.
These endpoints return `{ "success": true }`, including when already archived;
unknown IDs return 404. All data, versions, relationships, and editor documents
are retained. No user information is recorded with the archive flag.

Archived resources are excluded from REST `/maps` and `/maps.geojson` and from
current annotations API results, including list annotations. Explicit historical
annotation URLs (`@checksum`) still work. Other REST reads, including individual
resources and version listings, are unchanged.

Archiving is temporary: the next successful Live API snapshot save clears archive
flags on the image and **all** its map versions, including sibling maps. Merely
opening the editor does not unarchive anything. A pending debounced save can
unarchive content when it completes. No explicit restore endpoint is needed.

Current publication responses use bounded public cache lifetimes (30 seconds for
map searches, at most five minutes for individual and grouped annotations),
without stale reuse. Existing cached responses are not purged by archiving or by
deployment, so responses cached under older policies may outlive those budgets.
Historical annotation cache policies are unchanged.
