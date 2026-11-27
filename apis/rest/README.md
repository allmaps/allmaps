# Allmaps REST API

See [Hyperdrive setup](../HYPERDRIVE.md) for database connections and local
development, and [cache policies](../CACHE-POLICIES.md) for the endpoint audit.

## IIIF image aliases

`GET /images/:imageId` returns the image record for a canonical ID. For a known
alias it returns a short-lived `302` to that record. New image IDs hash the exact
service URI declared in the preferred service's `info.json`. Dimensions come
from the same response. Registering a manifest stores its canvas links without
requesting image metadata. When Editor opens an image for editing, it sends
`PUT /images/:imageId` with `{"url":"…/info.json","resolve":true}` to obtain
the current document URI and full metadata. Verified metadata is reused.
Services listed together on a painting body can share
an image when the manifest publisher controls their domains. Discovery uses
the preferred service when neither service has edits. If one group has edits,
it stays canonical. If both groups have edits, discovery returns `409` and
both documents remain accessible. Existing images can be read before they
have alias rows.

An administrator can move one image with `PATCH /images/:imageId` and a body
such as `{"url":"https://library.example/iiif/new-id/info.json"}`. The operation
compares the destination’s pixel dimensions with the source’s saved `info.json`.
If the source metadata is missing, Allmaps resolves it before comparing. A size
mismatch returns `409`. A successful move preserves the current maps and Canvas
links and repoints the alias group. An existing alias can be promoted, including one
opened in Editor with an empty initial document. A destination with edits or
map history returns `409`. If recent edits are still being persisted, retry after
they appear in the REST API. Clients editing the old document must reopen the
image after the move. Version URLs keep their original document IDs. Saved
images in lists follow the move, and pinned map versions keep their original
image and checksum.

The schema migration creates an empty alias table. Reconciliation of historical
documents is a separate operation. A future institution-scoped bulk route can
dry-run URL substitutions and invoke the same single-image migration per result.

## Develop OAuth callback proxy

The existing develop OAuth applications and registered callbacks remain in use.
Better Auth's OAuth Proxy transports the provider result through the fixed
`https://dev.api.allmaps.org/auth/callback/{provider}` callback. A trusted preview
creates its own user/session in its own database. No new provider app, email
service or shared administrator password is introduced.

### Activation and production

The plugin is absent unless `OAUTH_PROXY_ENABLED=true`. Activation requires:

- `OAUTH_PROXY_URL=https://dev.api.allmaps.org` exactly.
- A dedicated random `OAUTH_PROXY_SECRET` of at least 32 characters, distinct
  from each deployment's `BETTER_AUTH_SECRET`. All participating trusted
  environments share this proxy secret; their main signing secrets stay separate.
- A comma-separated `OAUTH_PROXY_ALLOWED_ORIGINS`, initially
  `https://pr-*.preview.api.allmaps.org,https://pr-*.preview.console.allmaps.org`.
- HTTPS Allmaps auth URLs, with a non-production cookie prefix for previews.

Production URLs and the `allmaps` production cookie prefix are rejected if
activation is attempted. Only the scoped `pr-*.preview.api.allmaps.org` and
`pr-*.preview.console.allmaps.org` wildcard origins are allowed; broader
wildcards and external origins are rejected.
Normal develop login redirects use the `https://dev.*.allmaps.org` pattern
and the develop homepage origin, without enumerating individual services.
The scoped preview patterns do not include production apps.
The top-level production Wrangler configuration has no activation variables.
Merging code alone does not turn the feature on in production.

The develop-only Wrangler vars enable the feature. The develop Cloudflare build
must run `node ../../scripts/prepare-develop-oauth.ts && pnpm run deploy:dev`
from `/apis/rest`, with the dedicated proxy secret stored as a secret build
variable. The helper provisions only the `rest-develop` runtime secret through
Wrangler stdin before deploying code. Ordinary production builds do not invoke
this helper. Never log or commit the proxy secret.

Better Auth is pinned to 1.7.7, with its Zod dependency aligned to avoid duplicate
schema types in generated public declarations. Coordinator and previews must use
the same Better Auth version. Restart sign-in attempts started before rollout.
The existing account-linking policy is unchanged and OAuth state remains in
the database.

### Preview provisioning

The `console-statistics-preview` Neon branch is a copy of develop. The dedicated
`console-preview` and `rest-preview` Workers are separate from existing Workers.
The intended hostnames are `pr-<identifier>.preview.console.allmaps.org` and
`pr-<identifier>.preview.api.allmaps.org`. The REST preview must use the dedicated preview
Hyperdrive/database, its own main secret and cookie prefix, and the shared proxy
secret. Provider client IDs are public and may be configured on the preview.
GitHub only needs its client secret on the fixed callback server; explicitly
enabled proxy previews may configure just the GitHub client ID. Google requires
both its client ID and client secret on the preview as well, because Better Auth
checks both before generating the authorization URL. An ID-only Google
configuration is accepted in proxy previews but leaves Google login disabled.

Preview origins and the shared proxy secret are for trusted first-party branch
code. Do not inject them into arbitrary contributor or fork previews: a holder
of the proxy secret has authentication authority across participating deployments.
A preview URL is publicly reachable, while private statistics remain protected by
normal sign-in and role/membership checks.

### Validation

`test/apis/test/oauth-proxy.test.ts` exercises the production guard and the full
provider/develop/preview redirect flow with separate PGlite databases. Provider
network calls are mocked; state handling, encrypted transport and session writes
are real. Ordinary Google login, session and account-linking tests also run.
No deployed browser login has been verified before the develop PR is merged and
the preview code is deployed.
