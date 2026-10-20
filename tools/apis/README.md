# Local APIs with PGlite and PostgreSQL

Run REST, Annotations and Live in one Node process against one database. Use
Node.js 24 or newer and PNPM 12. Bun and tsx are not required.

This workspace owns the API runner and local database lifecycle. Demo data and
seeding live in [tools/seed](../seed/README.md), environment setup in
[tools/setup](../setup/README.md), and IIIF assets and their handler in
[tools/iiif-server](../iiif-server/README.md). API and tooling integration tests
remain in [test/apis](../../test/apis/README.md).

Other workspaces import reusable tooling from `@allmaps/tools-apis`, whose entry
point is native TypeScript. The runner imports API factories from
`@allmaps/api-live`, `@allmaps/api-rest`, and `@allmaps/api-annotations`; those
packages expose compiled app modules. Importing these entry points does not
start servers or open databases.

## Start development

Start the APIs against local PGlite when their configured ports are free:

```sh
pnpm dev:apis
```

This first runs `pnpm build:apis`, then starts the runner if the build succeeds.
Turbo reuses cached builds where possible. Arguments such as `--db=postgres` are
passed to the runner. Use `pnpm watch` in another terminal to rebuild API/package
outputs as you edit; `pnpm build:apis` remains available separately for tests.

Restart this command manually after code or configuration changes. There is no
supervisor, automatic restart, Git branch polling, or migration watcher. Ctrl+C
and SIGTERM stop incoming requests, close WebSockets, finish accepted ShareDB
writes, flush snapshots, and close the database. A signal during initialization
allows the transaction to finish before shutdown.

Shutdown prints `Stopping APIs…`, followed by `APIs stopped.` after connections
close successfully. Persistence errors are always reported. To include detailed
ShareDB persistence metrics, run with `NODE_DEBUG=allmaps:sharedb`, for example
`NODE_DEBUG=allmaps:sharedb pnpm dev:apis --db=pglite`.

REST uses port 5499, Annotations 5498, and Live 5497 by default, from the
tracked `.env.localhost`. IIIF fixtures use port 5506 from `ports.json`. All values
in `.env.localhost` are loaded, then overridden by
`.env.localhost.local`, then shell variables. There is no duplicate list of URL
defaults in TypeScript. The runner never writes environment
files; `setup:env` explicitly adds missing local settings. API URLs must be localhost HTTP origins. Switching databases
requires stopping the runner, starting it again, and refreshing the apps.

Startup checks API ports before opening the database. PGlite reuses a compatible
IIIF fixture server or serves the existing fixture handler itself. Keep Wrangler's
separate API `dev` commands for Cloudflare-specific checks.

The standalone Live API's `dev` script uses Node's native TypeScript support and
watches `src/index.ts`. Workspace dependencies use their compiled outputs; run
`pnpm build:apis` first, or keep `pnpm watch` running while editing dependencies.
The production `start` script runs the compiled `dist/index.js` with Node.
TypeScript rewrites Live's relative `.ts` imports to `.js` during the build.
These standalone commands retain their configured PostgreSQL connection; use
`pnpm dev:apis` for the shared PGlite database.

## Configure the environment

PGlite works without database credentials. To configure missing local settings:

```sh
pnpm setup:env
# Or connect to an existing development PostgreSQL database:
pnpm setup:env --db=postgres
```

The [environment setup tool](../setup/README.md) runs directly with Node 24+,
without building the APIs. It preserves existing settings, generates a missing
authentication secret, and offers optional GitHub login. It never opens a database
or starts a server.

## Commands and local data

| Command                                         | Behavior                                                       |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev:apis`                                 | Open PGlite, initialize it if empty, and seed the demo         |
| `pnpm dev:apis --db=postgres`                   | Connect to `DATABASE_URL`; never apply migrations              |
| `pnpm dev:apis --db=pglite`                     | Explicitly select PGlite                                       |
| `pnpm db:generate --name add-map-field`         | Generate SQL and snapshots offline                             |
| `pnpm db:migrate --db=pglite`                   | Apply pending migrations to the existing local PGlite database |
| `pnpm --filter @allmaps/tools-apis seed:pglite` | Initialize/seed PGlite without listeners                       |

The default local directory remains `test/apis/.pglite` to reuse the populated
POC database without moving it. The older `test/apis/.pglite-synthetic-v1` is
also preserved. Tests never open either directory.

`PGLITE_DATA_DIR` overrides the directory; relative paths resolve from the
repository root. To start fresh, choose a new empty directory:

```sh
PGLITE_DATA_DIR=tools/apis/.local/my-experiment pnpm dev:apis --db=pglite
```

Use the same path on subsequent starts to retain your edits. Nothing replaces
or deletes local databases automatically. There is no state file, target
inventory, `--fresh`, `--branch`, or `db:cleanup` command. Git branch changes do
not switch the database.

Run only one process per PGlite directory, including migration commands. Stop the
API runner before migrating. There are no lock files; the port
checks catch ordinary duplicate API starts but cannot prevent two processes
using the same database on different ports.

## Migrations

Edit `packages/db/src/schema`, then run `pnpm db:generate --name ...` and review
the SQL and snapshots in `packages/db/drizzle`. Generation needs no database
credentials.

An empty PGlite database is initialized from all migrations in one transaction,
including multi-statement seed SQL and PostGIS. Failed initialization rolls back;
correct the files and run the command again. At startup, existing databases only receive a
migration compatibility check: pending, changed, missing, or divergent migration
history stops startup before API listeners open. Older Drizzle metadata is read
by hash without upgrading its columns. Existing data is never reset.

To update the existing local database, stop the API runner, then run:

```sh
pnpm db:generate --name add-map-field
# Review the generated SQL before applying it.
pnpm db:migrate --db=pglite
pnpm dev:apis --db=pglite
```

The migration command uses the same `PGLITE_DATA_DIR` and configuration precedence
as the runner, defaulting to `test/apis/.pglite`. Set the same override for both
commands if you use another directory. It requires an existing initialized
database, validates applied migration hashes, and executes only pending SQL in
one transaction. Failure rolls back the pending batch and its history entries;
correct the unapplied SQL and rerun the command. Ctrl+C/SIGTERM let the migration
and database close finish before exiting. No API build or listeners are needed.

Manual migration retains the database and does not reseed it. Changes to data
come from the SQL you review and apply. Changed or missing applied migrations
are rejected. Older metadata is supported; names are added for new entries
without rewriting old history. Repeating the command when up to date does not
apply anything.

To start over instead, select a new empty `PGLITE_DATA_DIR` and retain the old
database. `db:migrate` requires an explicit `--db=pglite`; omitting the selector
or choosing PostgreSQL fails before opening a database. It ignores PostgreSQL connection
URLs. PostgreSQL migrations for `develop` and `main` belong in the
[API release workflow](../../.github/API_RELEASES.md); this local tool never
applies them. Feature branches only run CI checks.

## PostgreSQL, including Neon

Set these values in `.env.localhost.local` or the shell:

```dotenv
DATABASE_URL=postgresql://user:password@host:5432/database
BETTER_AUTH_SECRET=your-local-authentication-secret
```

Then run:

```sh
pnpm dev:apis --db=postgres
```

`DATABASE_URL` is the only connection selector. It supports `postgres://` and
`postgresql://` URLs with a host and database. Connection parameters such as
`sslmode=require` are passed unchanged to the existing PostgreSQL driver.
No Neon CLI or `NEON_*` settings are needed to start the APIs. `pnpm setup:env --db=postgres` can collect the URL and
generate the authentication secret.

GitHub login is optional. To enable it, set both `GITHUB_CLIENT_ID` and
`GITHUB_CLIENT_SECRET`; leaving both unset or empty disables the provider.
Supplying only one is a configuration error. The REST API omits its GitHub login
link and the app menus hide GitHub sign-in when the provider is disabled. PGlite's
seeded-user login still works. PostgreSQL without GitHub supports public API access
and existing sessions, but does not provide a new interactive sign-in method.

The runner connects directly to the supplied URL and prints the host and database
without credentials or query parameters. There is no confirmation prompt or
provider-specific branch detection. Use a development database only; never supply
the main or production database URL.

For Neon, manage development branches with `neonctl` and put the chosen branch's
connection string in `DATABASE_URL`. The former
`db:branch` command and `--db=neon[:branch]` selectors have been removed.
Changing the URL requires restarting the runner and refreshing the apps.
`pnpm dev:apis` still defaults to PGlite even when `DATABASE_URL` is configured.

The database must already have PostGIS and the project's migrations applied.
Startup checks migration compatibility using read queries; it never initializes,
seeds, migrates, or deletes a PostgreSQL database. Apply PostgreSQL migrations
through the [API release workflow](../../.github/API_RELEASES.md).

All APIs and authentication share the same PostgreSQL connection helper.
PostgreSQL mode allows normal API data writes. Auth secrets are explicit, and
cookies are separated by the selected connection URL. Demo seeding and
seeded-user login are PGlite-only.

## Demo dataset and tests

The demo contains four local IIIF fixtures, three maps, six initial map versions
and ShareDB operations, four users, two organizations, memberships, and research
lists. [The seed workspace](../seed/README.md) owns the definitions and insertion
code. Completion markers preserve edits and let interrupted first-time seeding
resume. The runner passes its open PGlite database to the seed function.

`GET /__dev/seed` returns the catalog. `POST /__dev/login/:slug` creates a real
Better Auth session for `local-admin`, `local-editor`, `local-member`, or
`local-visitor`. These endpoints exist only in PGlite mode.

```sh
pnpm --filter @allmaps/tools-apis types
pnpm --filter @allmaps/test-apis types
pnpm test:apis
```

Tests use only in-memory or temporary local PGlite databases and local fixtures.
They cover environment setup and preservation, optional GitHub login, API responses,
PostGIS, permissions, cookies, WebSockets, shutdown
persistence, reseeding, migration compatibility, and PostgreSQL configuration without real PostgreSQL connections.
Native Node tests own temporary loopback listeners; test guards block external
connections, normal development ports, non-temporary storage, and external commands. They never start persistent development servers or build Vite.
