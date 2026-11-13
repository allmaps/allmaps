# Console statistics

Daily per-domain statistics power global and organization dashboards. Domain
mapping changes only affect which summary rows are read; they do not rebuild
source data. No chart library is selected. History is displayed as a table with
UTC date and day/week/month/year selectors.

## Storage and semantics

`statistics_daily` has a primary key on `(domain, day)` and a day index. An empty
domain represents resources whose URI has no parsed domain: these are included
globally and are never mapped to an organization. Unassigned real domains are
also included globally.

Each row contains two different kinds of metrics:

- Activity: new retained images, manifests, logical maps, and images first seen
  with a geographic footprint. Map versions are grouped by map ID and image ID
  before counting. Multiple maps/versions do not multiply first-georeferenced
  image counts. This is inferred from retained records and earliest retained
  versions, **not** a complete audit log of user actions or deleted records.
- Stock: sampled counts of active images, current active maps, manifests,
  images without a manifest, and images with a geographic footprint. These are
  populated only by an actual refresh. The sample time is preserved. They are
  not claimed to be exact midnight or reconstructed historical end-of-day stock.

Backfill writes activity only. Historical stocks remain NULL and appear as a
dash in the console; existing measured stocks are never overwritten by a
backfill. Additions sum across periods; stock takes the last available sample
within the selected range of each period. Partial periods use only selected
days, weeks start on Monday, dates use UTC, and coverage/stock dates are returned.
A missing snapshot is different from a zero count. No-images percentage is NULL.

A manifest is attributed by its own URI domain, as in existing organization API
filtering. An image without a manifest is detected through canvas relationships,
including cross-domain relationships, without duplicate counts. Related manifest
lists are a different metric and must use distinct IDs across domains.

## Prepare and try locally

1. Build the existing API dependencies (`pnpm build:apis`).
2. For an existing PGlite database, stop the runner and apply migrations with
   `pnpm db:migrate --db=pglite`. A fresh local API database uses the normal
   initialization/seed workflow.
3. Run the initial backfill for the desired inclusive range, then refresh:

   ```sh
   pnpm --filter @allmaps/tools-apis run statistics --mode backfill --db pglite --data-dir /absolute/path/to/pglite --from 2025-01-01 --through 2026-11-13
   pnpm --filter @allmaps/tools-apis run statistics --mode refresh --db pglite --data-dir /absolute/path/to/pglite
   ```

4. Restart the API runner and console. Sign in as `local-admin` for global
   statistics or as `local-member` for organization statistics. The overview is
   read-only; the separate edit page and mutation API require an Allmaps admin.

The CLI never creates or migrates a database implicitly. For PostgreSQL, omit
`--db pglite`/`--data-dir` and supply the intended `DATABASE_URL` through the
existing secure environment. Never put credentials in arguments or checked-in
files. A direct connection is appropriate for this long-running maintenance job.
The migration adds only the summary table and index, not the initial backfill.
It must be deployed before the API switches to summary reads. Before the first
refresh the API returns 503 rather than silently scanning the source tables.

## Daily maintenance

The GitHub Actions workflow `Daily statistics` is configured for a daily sample
near the end of the UTC day and a manual refresh/backfill. Scheduling is disabled
until `STATISTICS_SCHEDULE_ENABLED=true` is reviewed and configured. Scheduled
runs use the existing production environment's `DATABASE_URL`. Manual runs target
`development` on develop or `production` on main. No job is activated by this
working-tree change. Apply migrations and run initial backfill/refresh before
shipping the new API.

The CLI serializes backfill/refresh using a transaction-scoped advisory lock.
Refresh atomically recalculates activity since the preceding day (or since the
last recorded sample after an outage) and captures today's stock. Re-running a
job replaces its results instead of incrementing counters. Missed stock samples
cannot be recovered honestly; their activity can still be backfilled. An explicit
refresh `--from` can revisit older activity after imports/corrections. Source
reassignment/corrections outside that window require an explicit backfill;
organization domain mapping changes never require one.

GitHub schedules are best-effort and may be delayed. `snapshotAt`/`measuredAt`
record the actual sample time and the sample belongs to its real UTC date. A
late run never invents a snapshot for yesterday. This batch may scan all retained
map versions once; that expensive work happens in maintenance, not per dashboard
request. Maintenance performance has not yet been measured on a Neon test branch.

## API

- `GET /statistics`: admins or users assigned the `collaborator` role.
- `GET /organizations/:organizationId/statistics`: any member of that
  organization or an Allmaps admin. Collaborator status alone grants no access.
- Append `/history?from=YYYY-MM-DD&through=YYYY-MM-DD&interval=day` to either route
  for history. Intervals: day, week, month, year. Range is inclusive and at most
  ten years; invalid dates/ranges are rejected.
- Responses are private/no-store. Current totals include their daily sample time.
  Current domain mappings apply to historical organization selections.

Existing image resource links retain their existing georeference filter, which
can differ from the statistics' geographic-footprint definition; the overview
explains the distinction. Organization views in Here, Editor, Explore and Latest
remain labeled placeholders. No new app filters, quality analysis, hourly data,
role-management UI, or preview deployment is included.

## Validation

```sh
pnpm --filter @allmaps/test-apis exec vitest run test/statistics.test.ts test/statistics-daily.test.ts test/migrations.test.ts
pnpm --filter @allmaps/console check
node --test scripts/statistics/prototype.test.mjs
```

The standalone SQL files remain exploratory live-query references; the runtime
API now reads only stored summary rows. Tests exercise rights, retry behavior,
retained-version deduplication, empty versus missing counts, stock versus flow,
UTC grouping, and preserved snapshots. No benchmark results are checked in.
