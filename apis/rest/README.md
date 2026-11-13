# Allmaps REST API

See [Hyperdrive setup](../HYPERDRIVE.md) for database connections and local
development, and [cache policies](../CACHE-POLICIES.md) for the endpoint audit.

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
secret. Provider client IDs are public and may be configured on the preview;
provider client secrets are only needed by the fixed callback server. The schema
allows IDs without provider secrets only in explicitly enabled proxy previews.
Google additionally needs a non-empty client-secret field to build its
authorization URL. Enabled proxy previews use a clearly marked non-secret
placeholder for that local check; only the coordinator exchanges codes with
Google using the real provider secret. Normal login never uses this placeholder.

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

## Statistics branch build wiring

Cloudflare Workers Builds watches only `feat/console-domain-statistics` for the
separate `console-preview` and `rest-preview` Workers. These triggers reuse the
existing Allmaps GitHub repository connection and the corresponding develop
build-token registrations. The repository-root build command installs the frozen
lockfile, builds APIs and console dependencies, then invokes
`node scripts/deploy-console-preview.ts console` or the `rest` target.

The deploy script refuses any other branch and derives both hostnames from
`PREVIEW_NAME` (default `pr-766`):
`<name>.preview.console.allmaps.org` and `<name>.preview.api.allmaps.org`. It
uses only the dedicated preview Hyperdrive binding, and disables workers.dev.
The REST build needs `OAUTH_PROXY_SECRET`, `PREVIEW_BETTER_AUTH_SECRET` (distinct
secrets) and `PREVIEW_HYPERDRIVE_ID`. Secret values are written to a temporary
mode-0600 file and uploaded alongside code with Wrangler's `--secrets-file`, then
deleted. They never enter the generated public Wrangler configuration or command
arguments. The public OAuth client IDs may be supplied as build variables or
read from develop's ordinary provider authorization redirects; no provider
client secrets are copied into previews.

Preview code and custom domains are deployed by the GitHub-connected builds,
not by ad-hoc uploads through the Cloudflare plugin. The callback-proxy PR must
be merged and its develop build must succeed before preview login works.
The first preview statistics migration and population are managed separately on
the isolated Neon branch; production and the develop database are not migrated
by the preview deployment script.
