# API migrations and releases

The `APIs` workflow checks all pull requests, including stacked PRs, and pushes
to `develop` and `main`.
After checks pass, an enabled release validates the target database's migration
history, applies pending SQL, and deploys REST, Annotations, and Live from the
checked-out commit. A migration failure prevents all deployment steps.

Releases run only when the corresponding repository enable switch is exactly
`true`. Check the current switch before merging: a merge into an enabled branch
triggers migrations and deployment. Tests and Worker dry runs do not deploy.

| Git branch | GitHub environment | Neon branch | Cloudflare Workers                    | Railway environment |
| ---------- | ------------------ | ----------- | ------------------------------------- | ------------------- |
| `develop`  | `development`      | `develop`   | `rest-develop`, `annotations-develop` | `develop`           |
| `main`     | `production`       | `main`      | `rest`, `annotations`                 | `main`              |

## Everyday schema changes

1. Edit the schema in `packages/db/src/schema`.
2. Run `pnpm db:generate`. Generation is offline.
3. Review and commit the generated SQL and snapshot together.
4. Test locally, including `pnpm db:migrate --db=pglite` for an existing local
   database, with the local runner stopped.
5. Merge into `develop`. After the development release succeeds, promote the
   same migrations to `main`.

Never edit, delete, reorder, or reuse timestamps of applied migrations. Add a new
migration instead. Keep schema changes compatible with the currently running API:
add new fields first, update callers, and remove old fields in a later release.
Deployments across Cloudflare and Railway are not atomic.

The workflow runs on all changes, so API releases without schema changes still
validate history; migration is then a no-op. Feature branches only run checks
through pull requests, not remote migrations.

## What CI checks

The runner uses Node 24, the `packageManager` pnpm version, and
`pnpm install --frozen-lockfile`. The old workflow that rewrote and pushed the
lockfile is replaced by this validation. Update and commit the lockfile locally
when dependencies change.

```sh
pnpm build:apis
pnpm test:apis
pnpm test:release
pnpm types:apis
pnpm types:release
pnpm --filter @allmaps/api-rest exec wrangler deploy --dry-run
pnpm --filter @allmaps/api-annotations exec wrangler deploy --dry-run
```

API tests use temporary PGlite/PostGIS databases. Release tests replace HTTP and
deployment commands with fakes. Neither suite uses Neon or hosting credentials.
Worker dry runs bundle code without uploading it. No Vite app builds or
persistent development servers are needed.

## One-time configuration

Create GitHub environments `development` and `production`, restricted to the
`develop` and `main` branches respectively. No required reviewer is needed for
automatic releases. Require `API checks` in branch rules if merges must pass CI.

Set these secrets separately in each GitHub environment:

| Secret                 | Value                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`         | Direct, non-pooled Neon connection URL for the correct branch, database and migration role |
| `CLOUDFLARE_API_TOKEN` | Account-scoped Workers deployment token with Hyperdrive Read permission                    |
| `RAILWAY_TOKEN`        | Railway project token scoped to the target environment                                     |

Set these variables in each GitHub environment:

| Variable                 | Value                           |
| ------------------------ | ------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`  | Account hosting the API Workers |
| `RAILWAY_PROJECT_ID`     | Allmaps Live project            |
| `RAILWAY_ENVIRONMENT_ID` | Matching Railway environment    |
| `RAILWAY_SERVICE_ID`     | Live service                    |

The existing Railway targets were verified during preparation:

| Setting               | Value                                  |
| --------------------- | -------------------------------------- |
| Project               | `e92b6b3a-f2c8-4f87-abf2-5d404d8daa11` |
| Service               | `b92100e3-f528-4cc6-ad1a-b128c0bd9c13` |
| `develop` environment | `7cb604ab-7108-4770-be99-48d072a60236` |
| `main` environment    | `7a6be1be-bcf0-4fcd-adce-ff629cb02b75` |
| Cloudflare account    | `6b4ce0b3a6c21b7769cc1c3eff7eaadf`     |

Confirm these targets during cutover. REST and Annotations use a `HYPERDRIVE`
binding; Live retains its runtime `DATABASE_URL`. Keep authentication secrets
configured on the corresponding Workers and Railway service. The GitHub
`DATABASE_URL` identifies the migration database and is supplied to preflight,
migration, and deployment verification. It is never passed as a Wrangler variable
or included in command arguments. Wrangler uses `--keep-vars` and does not import
local dotenv overrides in CI.
Live uses the repository root as its build context and `apis/live/railway.json`
as its Railway config file.

Releases also require one of these **repository-level** GitHub Actions variables
to be exactly `true`:

- `API_RELEASE_DEVELOP_ENABLED`
- `API_RELEASE_MAIN_ENABLED`

Leave them absent or `false` while preparing. These are repository variables
because the release job's condition is evaluated before its environment is
loaded. They do not cancel a release already in progress.

## Cutover and remote rehearsal

1. Land the `pglite` foundation and this workflow with both switches disabled.
   Run `API checks` on GitHub and inspect the result.
2. Configure environment secrets and variables. Check that runtime API URLs and
   CI migration URLs select the same Neon branch and database.
3. Verify PostGIS and existing Drizzle history on both target databases. CI
   deliberately refuses to initialize or guess a baseline for an untracked
   database.
4. Rehearse against a disposable Neon branch cloned from development, with a
   small unapplied migration. Supply its direct URL explicitly and run:

   ```sh
   pnpm build:apis
   CI=true pnpm --filter @allmaps/db run db:migrate:ci
   ```

   Set `DATABASE_URL` securely in the command environment first. Confirm data
   preservation, applied history and a no-op second run. This remote rehearsal
   is separate from the isolated tests and has not been performed by them.

5. At a quiet point with no deployments running, disconnect Git builds for
   `rest-develop` and `annotations-develop` in Cloudflare and disable Git
   autodeploy for Live's `develop` environment in Railway. Set
   `API_RELEASE_DEVELOP_ENABLED=true`, then manually dispatch `APIs` on the
   current `develop` head. Verify migration, all three deployments and public
   health checks.
6. Repeat for production after development succeeds: switch `rest`, `annotations`
   and Live's `main` environment, then enable `API_RELEASE_MAIN_ENABLED`.

Frontend deployments and the IIIF fixture service are outside this workflow.
The switch must precede enabling releases so a hosting provider cannot deploy
new code before migration.

## Hyperdrive verification

Create one Hyperdrive configuration per database environment, pointing at Neon's
direct endpoint, with SQL query caching disabled. Bind it as `HYPERDRIVE` in both
API Wrangler configs: `env.dev.hyperdrive` for development and top-level
`hyperdrive` for production. Development is configured; production IDs remain
placeholders until provisioning. See [Hyperdrive setup](../apis/HYPERDRIVE.md).

The release reads the selected configs from the checkout, rejects placeholders,
missing/duplicate bindings and unexpected Worker names, then reads each distinct
Hyperdrive resource through Cloudflare's API. It requires `caching.disabled: true`
and the same PostgreSQL host, port and database as the environment's migration
`DATABASE_URL`. Hyperdrive may use a dedicated API role with different credentials.
The Cloudflare token therefore needs **Hyperdrive Read** in addition to its Worker
deployment permissions; a failed lookup stops the release.

These checks run before migration and again immediately before deployment. They
validate the bindings about to be deployed, allowing the initial transition from
Workers still using `DATABASE_URL`. Existing Worker settings are checked for
existence, not for the obsolete database binding. GitHub's current branch head
check still runs last in preflight. Neither verification prints database
credentials or queries the database.

## Failure and concurrency behavior

The entire migration/deployment job has one concurrency group per branch, with
`cancel-in-progress: false`. Active releases finish; GitHub may replace an older
pending job with a newer one. Before migration the workflow checks the current
branch head and rejects stale runs, including retries of superseded commits.
A new push arriving after migration starts waits for the active release.

The migration command checks hashes, missing/duplicate/out-of-order history and
PostGIS before invoking the pinned Drizzle ORM migrator. A PostgreSQL transaction advisory
lock prevents another invocation of this command from migrating concurrently.
CI never loads local dotenv files. Demo PGlite seeding is not invoked; historical
seed SQL already committed as migrations remains part of migration history.
`db:migrate:ci` runs `src/migrate-ci.ts` directly with Node; the migration command
itself does not require a build. API builds are still required for the release.

Drizzle may upgrade old migration metadata. History is validated before that
upgrade, and checked again after applying SQL. Validation, metadata upgrades and
pending SQL all run on the same connection in one transaction. The advisory lock
is released only when that transaction ends; a disconnect aborts the migration.
There is no automatic down migration.

Cloudflare deployment must succeed before continuing. Railway CLI is pinned;
the workflow uploads this checkout and polls the returned deployment ID, not
the newest deployment in a list. A build completing is not enough: Railway must
report `SUCCESS`, then all three API root URLs must return JSON with a version.
These are availability smoke checks, not a full hosted database or WebSocket test.

If migration succeeds and a deployment fails, the schema stays migrated. Fix the
deployment or retry the current branch head. A retry validates history and skips
already-applied SQL. For an urgent pause, disable that branch's release switch;
do not cancel an in-progress migration. Inspect Railway's returned deployment ID
if a workflow times out while a deployment is still running.

References: [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[Cloudflare CI](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/),
[Wrangler deploy](https://developers.cloudflare.com/workers/wrangler/commands/workers/),
[Railway CLI](https://docs.railway.com/cli/up),
[Railway autodeploys](https://docs.railway.com/deployments/github-autodeploys).
