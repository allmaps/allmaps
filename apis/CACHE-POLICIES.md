# REST and annotations cache policies

All route registrations in `apis/rest/src` and `apis/annotations/src`, including
shared Better Auth routes, were reviewed. The executable inventory is
`test/apis/test/cache-policy.test.ts`: a new GET route fails the inventory test
until it has an explicit cache decision. Mutation routes are enumerated too.

## Shared safeguards

- Default: `private, no-store`, including OpenAPI documents and unknown routes.
- Only successful anonymous GET/HEAD responses can retain a public policy.
- Cookie or Authorization headers, Set-Cookie responses, authentication routes,
  all mutations, redirects and errors are `private, no-store`.
- Errors override any public policy selected before a database failure.
- CORS reflects the Origin without `Vary: *`. Public representations vary on
  Origin, Cookie and Authorization, preventing anonymous cached responses from
  being reused for credential-bearing requests.
- Elevated limits and organization member/admin representations retain their
  existing private policies, in addition to the credential safeguard.

## Public TTLs

| Preset | Browser max-age | Shared s-maxage | stale-while-revalidate |
| ------ | --------------- | --------------- | ---------------------- |
| short  | 30 seconds      | 30 seconds      | none                   |
| medium | 1 minute        | 5 minutes       | none                   |
| long   | 1 hour          | 1 day           | 7 days                 |

These are existing freshness budgets, not immediate invalidation guarantees.
Writes do not invalidate browser caches. A credential-bearing request is never
served under these public policies.

## REST endpoints

| Endpoints                                                                                                                      | Policy for successful anonymous GET        |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `/`                                                                                                                            | short                                      |
| `/maps`, `/maps.geojson`                                                                                                       | short                                      |
| `/maps/:mapId` (including `@checksum` and `.geojson`), `/maps/:mapId/versions`                                                 | medium                                     |
| `/images`, `/canvases`, `/manifests`                                                                                           | short                                      |
| `/images/:imageId`, `/canvases/:canvasId`, `/manifests/:manifestId`                                                            | medium                                     |
| `/images/:imageId/versions`                                                                                                    | medium                                     |
| `/images/:imageId/maps[.geojson]`, `/canvases/:canvasId/maps[.geojson]`, `/manifests/:manifestId/maps[.geojson]`               | medium                                     |
| `/organizations`, `/organizations.geojson`, `/organizations/:organizationId`                                                   | medium; private for personalized responses |
| `/organizations/:organizationId/images`, `/organizations/:organizationId/canvases`, `/organizations/:organizationId/manifests` | short                                      |
| `/projections`, `/projections/:projectionId`                                                                                   | long                                       |
| `/images/random`, `/canvases/random`, `/manifests/random`                                                                      | private, no-store                          |
| `/lists`, `/lists/:listId`, `/users`, `/users/:userId`, `/organizations/:organizationId/users`                                 | private, no-store                          |
| All POST/PUT/PATCH/DELETE routes, including hidden IIIF PUT routes                                                             | private, no-store                          |

## Annotations endpoints

| Endpoints                                                                                              | Policy for successful anonymous GET |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `/` without `url`                                                                                      | short                               |
| `/?url=…` redirect                                                                                     | private, no-store                   |
| `/maps`, `/maps.geojson`                                                                               | short                               |
| `/maps/:mapId` (including `@checksum` and `.geojson`)                                                  | medium                              |
| `/images/:imageId` (including `@imageChecksum` and `.geojson`)                                         | medium                              |
| `/canvases/:canvasId`, `/manifests/:manifestId`, `/organizations/:organizationSlug[.geojson]`          | medium                              |
| `/maps/random`                                                                                         | private, no-store                   |
| `/@:username/lists`, `/@:username/lists/:listId`, `/@:username/lists/:listId/georeference-annotations` | private, no-store                   |

In both APIs, `/auth` and `/auth/*` (Better Auth), `/login/github`, `/login/google`, `/logout` and
`/openapi.json` are private/no-store. OPTIONS responses are uncached HTTP
responses; CORS preflight caching via Access-Control-Max-Age is independent.

Versioned map/image responses are **not immutable**: their georeferencing version
is fixed, but generated representations also join current organization names,
homepages, IIIF labels and relationships. These now use the medium policy.

## Cache layers

Hyperdrive SQL query caching remains disabled. Both Workers now use the shared
`fetchWithPublicCache` wrapper around their request handler. It checks
`caches.default` before creating a database client and only stores successful,
explicitly public, anonymous GET responses for maps, images, canvases, manifests,
and organizations (including GeoJSON). Authentication, lists, users, random
routes, mutations, HEAD, conditional and range requests bypass storage and lookup.
Cookie or Authorization headers (even empty), response Set-Cookie, unknown Vary
headers, errors, and request cache-bypass directives also prevent shared reuse.

Cache keys preserve the exact path and complete query string, representation,
Origin, Accept and Accept-Encoding headers, host, and API/version namespace. The namespaces are
`rest-v3` and `annotations-v3`; bump them if response semantics or visibility
rules change. Cache failures fall back to the handler. Writes and socket cleanup
run through `waitUntil`. Responses report `X-Allmaps-Cache: HIT|MISS|BYPASS`.

Search/list responses have a strict 30-second shared freshness window. Individual
resources and organizations have a five-minute window. No stale-while-revalidate
is applied to these mutable reads. Cache API enforces the route's `s-maxage`;
hits restore the original browser cache policy and preserve Date/Age headers
without renewing freshness. The stored response keeps the route's policy in an
internal `X-Allmaps-Cache-Policy` header, which is stripped from client responses.
This prevents Cloudflare's Browser Cache TTL from leaking an increased `max-age`
from the cached copy into the response. Entries without the original policy are
treated as misses; the v3 namespaces also exclude older entries. Existing browser
cache entries are not purged by a Worker deployment.
Cache API storage is local to each Cloudflare location;
a new location can still miss.
Writes do not purge these public responses immediately. Credentialed reads and
explicit no-cache requests go to the database, without storing their response.

Here and Latest omit credentials for map searches within the public limit of 200,
including for signed-in visitors. Larger requests retain `credentials: 'include'`
so the user's tier still applies. The limit is shared by the API and browser
helper in `@allmaps/stdlib`. Private lists and personalized organization requests
retain their existing authentication behavior. Viewer already uses the default
same-origin credentials mode for arbitrary source URLs; its public image/manifest
annotation lookups now explicitly omit credentials. External sources retain their
existing fetch behavior. Here's individual map reads also omit credentials.
Latest and Here use their configured API base URLs for these reads.

Node/PGlite API runners retain HTTP cache headers but do not have Cloudflare's
shared Cache API layer.

Regression coverage: `test/apis/test/response-cache.test.ts` checks actual stored
response reuse, expiry, separation and bypasses; the route inventory in
`cache-policy.test.ts` verifies each API's policy, including auth and errors.
