# API database connections

Both Cloudflare Workers use node-postgres (`pg` 8.23.1) and Drizzle through the `HYPERDRIVE`
binding. Routes and Better Auth share the same request-owned database client.
The app compiles once at startup, as required by Elysia on Workers. An
`AsyncLocalStorage` database facade resolves each query to its request-owned
client, including Better Auth queries. `finally` schedules client closure with
`waitUntil`, including on errors. Clients are never reused across Worker
requests. Hyperdrive maintains the pool of origin connections.

Each uncached request uses a request-local `pg.Pool` (maximum five connections).
Simple reads reuse one connection; concurrent Drizzle transactions check out
separate connections so transaction boundaries cannot interleave. The public
response cache runs before client creation, so a cache hit does not open a
connection. Connections open lazily on the first query; routes that do not query
the database do not open a connection.

All three APIs use the shared `getPgContext` helper. Live connects directly using
`DATABASE_URL` and owns one pool for its Node process. The combined local runner's
PostgreSQL mode shares one pool across REST, Annotations, authentication and Live,
including its read-only migration check. Node pools allow ten connections; Worker
pools allow five. Shutdown flushes Live's pending writes before closing the pool,
even if flushing reports an error.

PGlite mode and the isolated test suite retain the PGlite driver. Migration and
other tooling that still uses Postgres.js is unchanged.

## Local development

Set `DATABASE_URL` in the repository's ignored `.env.localhost.local` file to a
local Postgres database or the development Neon database. Run either:

```sh
pnpm --filter @allmaps/api-rest dev
pnpm --filter @allmaps/api-annotations dev
```

The launcher passes the connection string using
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`. An explicit value for
that environment variable takes precedence over the dotenv file. Credentials
are not included in command arguments or committed configuration.

Local Wrangler connects directly to this database: it validates driver behavior,
queries, transactions and responses, but does not reproduce Hyperdrive's cloud
pooling or query caching. See [Cloudflare's local development guide](https://developers.cloudflare.com/hyperdrive/configuration/local-development/).

## Provisioning before deployment

Both development Wrangler configurations reference `allmaps-develop`
(`d0b30a925f434ccfbd8c15279e7071df`), with SQL query caching disabled.

The production IDs remain zero placeholders. The deployment script refuses
those placeholders and omits the old `DATABASE_URL` Worker variable for these
APIs. Updating these local configurations does not deploy either API.

For each environment, configure a Hyperdrive resource in the Allmaps
Cloudflare account:

- Development: connect to the **develop** Neon branch.
- Production: connect to the **main** Neon branch.
- Use a dedicated database role with the API's required read/write privileges.
- Use Neon's **direct** connection endpoint, without `-pooler`: Hyperdrive owns
  connection pooling.
- **Disable query caching** (`caching.disabled: true`). This is a Hyperdrive
  resource setting, not a Wrangler binding option.

The development ID is already set under `env.dev.hyperdrive` in **both**
Wrangler files. Before production deployment, set the production ID under
top-level `hyperdrive`. The APIs may share one configuration per
database/environment. Keep credentials out of those
files. Regenerate bindings with each API's `cf-typegen` command.

With SQL query caching disabled, authentication/session queries always go to
Postgres. Anonymous public GET responses can be served by the separate Worker
response cache for their documented TTL; see [cache policies](./CACHE-POLICIES.md).
Requests with credentials or `Cache-Control: no-cache` bypass that cache. Enabling
SQL query caching later requires a separate design: Hyperdrive does not invalidate
SELECT results when a write occurs. See
[Neon's Hyperdrive guide](https://neon.com/docs/guides/cloudflare-workers) and
[Hyperdrive read-after-write behavior](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/#read-after-write-behavior).

## Release checks

GitHub releases and the local dotenv deployment launcher share the same
validation of the selected environment's Hyperdrive binding. The GitHub release
also verifies the resource through Cloudflare before migrations and again before
deploying: SQL caching must be disabled, and its PostgreSQL host, port and database
must match the environment's migration `DATABASE_URL`. The API role can differ
from the migration role. The GitHub Cloudflare token needs Hyperdrive Read in
addition to Worker deployment permissions. The existing deployed Worker may
still use the old driver during the initial transition.

Keep GitHub's migration `DATABASE_URL` and Live's runtime connection string;
REST and Annotations obtain their runtime connection from Hyperdrive. No database
URL is passed to Wrangler as a variable by the release script. See
[API release configuration](../.github/API_RELEASES.md).
