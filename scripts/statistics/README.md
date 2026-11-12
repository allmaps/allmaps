# Console statistics: first implementation

This branch adds current numeric statistics to the existing REST API and console.
There are no schema migrations, triggers, scheduled tasks, chart dependencies or
production database changes. Queries currently aggregate source records on demand;
persisted per-domain summaries remain a later performance optimization, not an
implemented feature. Domain configuration changes never run a statistics rebuild.

## Try it locally

Use the repository's existing setup and PGlite demo workflow. Sign in as
`local-admin` to open **Allmaps statistics** on the console home page. Organization
links now open a read-only overview with figures and labeled API links. An admin
can open **Edit organization** to use the existing settings form. The direct edit
page and existing mutation API both require an Allmaps admin. Sign in as
`local-member` to try organization statistics without edit access.

Run the API integration test using `pnpm --filter @allmaps/test-apis exec vitest run
test/statistics.test.ts`, the console check with `pnpm --filter @allmaps/console
check`, and the standalone SQL proof with `node --test
scripts/statistics/prototype.test.mjs`.

## API and definitions

- `GET /statistics`: Allmaps admins and users assigned the `collaborator` role.
- `GET /organizations/:organizationId/statistics`: any organization member or an
  Allmaps admin. Being a collaborator alone does not grant organization access.
- Responses are private and not cacheable. No new role-assignment UI is added:
  the existing repository does not define a collaborator management workflow.
- Maps count only current, non-archived rows, attached to non-archived images.
- An image with at least one such map with a geographic mask counts once as
  georeferenced. This is a provisional footprint-based definition, not quality.
- Zero images yields a null percentage rather than a misleading zero percent.
- Images without manifests use the image/canvas/manifest relationships; duplicate
  links do not inflate counts.
- An organization's images follow image URI domains; manifests follow manifest URI
  domains, consistent with existing organization API filtering. A related manifest
  on another domain is not included in the manifest total. Related-manifest listing
  is a separate metric and should use distinct manifest IDs.
- Existing API resource links use their existing georeference filter, which can
  differ from the footprint criterion above; the overview explains that difference.

## Deferred decisions

Choose a chart library on the laptop after assessing current maintenance, releases,
issue response, features and Svelte compatibility. No library is selected. Future
organization views in Here, Editor, Explore and Latest are labeled placeholders,
not new routes or filters in those applications.

Time-series SQL prototypes group retained image/manifest creation timestamps by
hour/day/week/month in UTC. They do not reconstruct historical stock. Map-version
creation is not automatically a map edit: saving an image republishes sibling maps.
Do not expose those timestamps as precise editing activity without further work.

If needed, persist aggregates by domain and time bucket, then combine them using
current organization domain mappings. Avoid expensive rebuilds for domain toggles.
Unique cross-domain relationship metrics require distinct IDs, not summing counts.
Measure real Neon query performance before choosing persistence or indexing.
