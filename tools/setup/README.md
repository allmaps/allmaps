# Local environment setup

Configure local app and API settings from the repository root:

```sh
pnpm setup:env
pnpm setup:env --db=postgres
```

PGlite is the default. PostgreSQL mode asks for a development `DATABASE_URL` if
missing. Use a development database URL, never main or production credentials.
The command generates a missing `BETTER_AUTH_SECRET` and offers GitHub login
with a default of no. If selected, it
asks only for missing `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. An existing
partial GitHub configuration is completed rather than discarded.

The tracked `.env.localhost` supplies all default values. The tool loads every
value from that file, then overlays `.env.localhost.local`, then shell variables.
Only missing secrets and credentials are saved; defaults are not copied into the
private file. To change a default, override just that variable in
`.env.localhost.local` or the shell. The three API URLs must remain localhost HTTP origins.
It appends missing settings to the ignored root `.env.localhost.local` with
owner-only permissions. Existing values, comments, and unrelated settings remain
intact, including empty placeholder lines. Shell settings take precedence and
are not copied into the file; keep them exported when starting the APIs.
Rerunning setup preserves the authentication secret and configured values.

Secrets are hidden while typing. Ctrl+C or end of input cancels before changes
are saved. No database is opened, migrations applied, or server started. The tool
runs directly with Node 24+ and uses the same Commander parser as the Allmaps CLI,
without an API build requirement. It prints commands for starting the APIs and an app afterward.

`src/setup.ts` owns prompting and saving; `src/prompt.ts` handles terminal input.
`src/environment.ts` provides the file loader, localhost URL validation,
PostgreSQL URL validation, and safe error formatting. Each tool declares its own
Commander options and generated help. The API runner imports these helpers through `@allmaps/tools-setup`.
API-specific settings such as target cookie names stay in `tools/apis`;
environment schemas stay in `packages/env`.

Tests remain in [test/apis](../../test/apis/README.md). Setup tests write only
into temporary directories and use fake connection strings.
