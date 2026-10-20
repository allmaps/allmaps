# Demo seed data

`@allmaps/tools-seed` defines and inserts the local demo dataset: four users,
two organizations, memberships, research lists, four IIIF resources, three maps,
and six initial map versions with ShareDB history.

- `src/seed-fixtures.ts` defines the records, stable IDs, and seed catalog.
- `src/seed.ts` inserts the records and history and records seed completion.
- Images, annotations, and manifests come from
  [tools/iiif-server](../iiif-server/README.md). They are read through its exported
  handler without network requests; no assets are duplicated here.

The API runner calls `seedDemoData(context, fixturePort)` with its already-open
PGlite database, Drizzle connection, and ShareDB instance. This workspace does not
read environment files, select a database, open connections, or start servers.
The runner also provides a command that seeds without opening API listeners:

```sh
pnpm --filter @allmaps/tools-apis seed:pglite
```

Build API dependencies first with `pnpm build:apis`. Use the same `PGLITE_DATA_DIR`
as the API runner, and stop the runner before opening that directory separately.
Database creation, migrations, and closing remain the runner's responsibility.
PostgreSQL demo seeding is not supported.

Completion markers retain local edits on repeated startup and allow interrupted
initial seeding to resume. Moving this code does not change seed IDs or versions.
Historical SQL seed migrations remain in `packages/db/drizzle`.

Tests live in [test/apis](../../test/apis/README.md) and import this package
explicitly. They use temporary or in-memory PGlite databases and local IIIF
fixtures, never the preserved development databases or remote PostgreSQL.
