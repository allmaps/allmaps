# Allmaps Live API

Live handles collaborative Editor changes over WebSockets and georeference-data
imports over HTTP. Both paths submit changes through ShareDB.

## HTTP import authentication

`POST /maps` and `PATCH /maps/:mapId` require an
`Authorization: Bearer <LIVE_IMPORT_SECRET>` header. The REST API checks the
signed-in user's admin role before forwarding an import with this service
credential. User session cookies and incoming authorization headers are not
forwarded to Live.

Live compares the credential in constant time after checking its length, before
parsing the request body. A missing or incorrect credential returns HTTP 401.
If `LIVE_IMPORT_SECRET` is absent or empty, imports return HTTP 503. Live still
starts, and its health endpoint and WebSocket editing remain available.

`POST /maps` currently replaces all maps for each image included in the import;
`PATCH /maps/:mapId` updates a single map.

## Configure the shared secret

Set the same `LIVE_IMPORT_SECRET` in the REST and Live deployments for each
environment. Use a cryptographically random value of at least 32 characters;
32 random bytes encoded as 64 hexadecimal characters is suitable. Keep separate
values for local development, development deployments, and production. Do not
reuse `BETTER_AUTH_SECRET`.

- REST on Cloudflare: provision it as a Worker secret, for example with
  `pnpm --filter @allmaps/api-rest exec wrangler secret put LIVE_IMPORT_SECRET`.
  Add `--env dev` when configuring the development Worker.
- Live on Railway: add it as a service environment variable in the matching
  Railway environment.
- Local development: set it in the Git-ignored `.env.localhost.local`. The combined
  API runner passes the same value to REST and Live.

Configure both services before deploying this change to keep imports available.
The deployment helper excludes this key from ordinary `--var` arguments; it
must be provisioned as a Cloudflare secret. Never commit real values or expose
this variable with a `PUBLIC_` prefix. This change does not generate secrets or
modify deployed environments.

REST sends the credential only to its configured Live URL, which must use HTTPS
(or HTTP on localhost/loopback for local development). Redirects are rejected.
Callers of the public REST import endpoints use their admin session, not this
service credential. Direct HTTP clients should switch to the REST endpoints.

## WebSocket access

WebSocket access remains public, including map edits. Protecting the HTTP import
endpoints does not impose edit budgets or prevent automated WebSocket edits.
Those controls can be added when migrating Live to Cloudflare.
