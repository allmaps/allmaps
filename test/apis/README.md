# Local API tests

Run `pnpm test:apis` from the repository root after `pnpm build:apis`.
API and tooling integration tests live here. The runner and database lifecycle
live in [tools/apis](../../tools/apis/README.md), demo data in
[tools/seed](../../tools/seed/README.md), and environment setup in
[tools/setup](../../tools/setup/README.md). These share one isolated test suite.

Tests always use embedded PGlite with PostGIS. Handler tests use in-memory
databases; persistence and native Node tests create disposable directories under
the suite's temporary directory. They never select a development target or load
repository environment files. Their controlled `test/fixtures/.env.localhost`
supplies local configuration, with owned temporary ports for HTTP tests; the
helpers pass this environment explicitly to the API context. The default persistent PGlite database in
`dev:apis` is never used by tests.

`test/helpers/setup.ts` installs isolation before each test file. It removes
inherited database configuration, restricts PGlite creation to temporary paths,
blocks TLS and connections to servers outside the test's allocated loopback
ports, and prevents external commands such as `neonctl`. The only subprocesses
permitted are the isolated native Node test runners. These receive a minimal
environment and install the same guard before
loading the API code. They reject PostgreSQL targets, non-temporary storage, and reuse
of existing fixture servers. The preserved databases and normal development
ports are never used.

Use `createTestContext`, `temporaryDirectory`, and `startTestRunner` from
`test/helpers/context.ts` for new tests. Do not invoke the development CLI.
The test helper has no database-mode or database-URL option. Import shared
tooling through its owning package: `@allmaps/tools-apis`, `@allmaps/tools-seed`,
`@allmaps/tools-setup`, or `@allmaps/tools-iiif-server`.
PostgreSQL configuration tests use fake URLs and local input/output streams.
The PostgreSQL connection helper is mocked before any connection can be opened;
migration compatibility checks use PGlite as their only backend. No test uses a
real PostgreSQL database or credentials.
Manual migration tests use temporary PGlite databases and verify existing data,
transaction rollback, history validation, and persistence after reopening.

The shared demo dataset is defined and seeded by `tools/seed/src/seed-fixtures.ts`
and `seed.ts`. Small assertion-specific data lives in `test/fixtures`. IIIF
images and metadata remain in `tools/iiif-server`; handler tests call its fixture
handler directly, and HTTP tests start their own temporary fixture listener.
Seeded image URLs use that listener's port, including both organization hosts.

Tests stop their listeners and remove their temporary files afterward. The test
command runs SvelteKit sync for fixture-server types, but does not build Vite or
start persistent development servers.

Environment setup tests use temporary environment files and fake connection URLs.
Authentication tests verify optional GitHub configuration against local PGlite;
they never contact GitHub or PostgreSQL.

Command-line tests create Commander commands with fake actions. They check help,
argument validation, and PGlite-only migration/seed restrictions without opening
databases, prompting for settings, or importing fixtures.
