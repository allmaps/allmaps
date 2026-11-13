# Develop OAuth callback proxy

The existing develop OAuth applications and registered callbacks remain in use.
Better Auth's OAuth Proxy transports the provider result through the fixed
`https://dev.api.allmaps.org/auth/callback/{provider}` callback. A trusted preview
creates its own user/session in its own database. No new provider app, email
service or shared administrator password is introduced.

## Activation and production

The plugin is absent unless `OAUTH_PROXY_ENABLED=true`. Activation requires:

- `OAUTH_PROXY_URL=https://dev.api.allmaps.org` exactly.
- A dedicated random `OAUTH_PROXY_SECRET` of at least 32 characters, distinct
  from each deployment's `BETTER_AUTH_SECRET`. All participating trusted
  environments share this proxy secret; their main signing secrets stay separate.
- An explicit comma-separated `OAUTH_PROXY_ALLOWED_ORIGINS`, initially
  `https://api-preview.allmaps.org,https://console-preview.allmaps.org`.
- HTTPS Allmaps auth URLs, with a non-production cookie prefix for previews.

Production URLs and the `allmaps` production cookie prefix are rejected if
activation is attempted. Wildcard or external preview origins are rejected.
Develop app origins are retained explicitly for normal develop login redirects.
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
Existing implicit account linking remains disabled and OAuth state remains in
the database.

## Preview provisioning

The `console-statistics-preview` Neon branch is a copy of develop. The dedicated
`console-preview` and `rest-preview` Workers are separate from existing Workers.
The intended hostnames are `console-preview.allmaps.org` and
`api-preview.allmaps.org`. The REST preview must use the dedicated preview
Hyperdrive/database, its own main secret and cookie prefix, and the shared proxy
secret. Provider client IDs are public and may be configured on the preview;
provider client secrets are only needed by the fixed callback server. The schema
allows IDs without provider secrets only in explicitly enabled proxy previews.

Preview origins and the shared proxy secret are for trusted first-party branch
code. Do not inject them into arbitrary contributor or fork previews: a holder
of the proxy secret has authentication authority across participating deployments.
A preview URL is publicly reachable, while private statistics remain protected by
normal sign-in and role/membership checks.

## Validation

`test/apis/test/oauth-proxy.test.ts` exercises the production guard and the full
provider/develop/preview redirect flow with separate PGlite databases. Provider
network calls are mocked; state handling, encrypted transport and session writes
are real. Ordinary Google login, session and account-linking tests also run.
No deployed browser login has been verified before the develop PR is merged and
the preview code is deployed.
