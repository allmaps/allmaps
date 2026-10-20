import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Command, CommanderError, Option } from '@commander-js/extra-typings'
import {
  loadLocalEnvironment,
  postgresTarget,
  safeError
} from '@allmaps/tools-setup'
import { apiEnvironment } from './config.ts'
import { root, defaultDataDirectory } from './paths.ts'
import ports from '../../../ports.json' with { type: 'json' }

type ApiOptions = {
  command: 'serve' | 'seed' | 'migrate'
  database: 'pglite' | 'postgres'
}

export function createApiCommand(run = runApiCommand) {
  const program = new Command()
    .name('pnpm dev:apis')
    .description('Run the local REST, Annotations, and Live APIs')
    .exitOverride()
    .addHelpText(
      'after',
      `
Start PGlite: pnpm dev:apis
Use PostgreSQL: pnpm dev:apis --db=postgres
Use Node 24+. pnpm dev:apis builds API dependencies before starting.
Configuration: .env.localhost, .env.localhost.local, then shell variables.
PGLITE_DATA_DIR selects local storage; empty databases are initialized and seeded.
Existing databases are checked for compatible migrations at startup.
PostgreSQL uses DATABASE_URL and requires BETTER_AUTH_SECRET.
Run pnpm setup:env --db=postgres to configure missing settings; GitHub login is optional.
Use a development DATABASE_URL, never main or production.
Use pnpm watch to rebuild while editing, then restart the APIs manually.`
    )

  program
    .command('serve', { isDefault: true })
    .description('Start the APIs (the default command)')
    .addOption(
      new Option('--db <database>', 'Database to use')
        .choices(['pglite', 'postgres'] as const)
        .default('pglite')
    )
    .action(async ({ db }) => {
      await run({ command: 'serve', database: db })
    })

  program
    .command('migrate')
    .description(
      'Apply pending migrations to an existing local PGlite database'
    )
    .addOption(
      new Option('--db <database>', 'Local database to migrate')
        .choices(['pglite'] as const)
        .makeOptionMandatory()
    )
    .action(async ({ db }) => {
      await run({ command: 'migrate', database: db })
    })
    .addHelpText(
      'after',
      '\nStop the runner, then use pnpm db:migrate --db=pglite.\nPostgreSQL migrations belong in GitHub Actions.'
    )

  program
    .command('seed')
    .description(
      'Initialize and seed local PGlite without opening API listeners'
    )
    .addOption(
      new Option('--db <database>', 'Local database to seed')
        .choices(['pglite'] as const)
        .default('pglite')
    )
    .action(async ({ db }) => {
      await run({ command: 'seed', database: db })
    })

  return program
}

async function runApiCommand(options: ApiOptions) {
  if (Number(process.versions.node.split('.')[0]) < 24)
    throw new Error('Node 24 or newer is required')
  const source = loadLocalEnvironment()
  const dataDir = resolve(root, source.PGLITE_DATA_DIR || defaultDataDirectory)
  if (options.command === 'migrate') {
    const finish = () =>
      console.error('Finishing the PGlite migration before exiting.')
    for (const signal of ['SIGINT', 'SIGTERM'] as const)
      process.on(signal, finish)
    try {
      const { migratePgliteDirectory } = await import('./migrations.ts')
      console.log(`PGlite: ${dataDir}`)
      const applied = await migratePgliteDirectory(dataDir)
      console.log(
        applied.length
          ? `Applied migrations:\n${applied.join('\n')}`
          : 'Database is up to date'
      )
    } finally {
      for (const signal of ['SIGINT', 'SIGTERM'] as const)
        process.off(signal, finish)
    }
    return
  }
  const environment = apiEnvironment(source, options.database, dataDir)
  for (const api of ['rest', 'annotations', 'live'])
    if (!existsSync(join(root, 'apis', api, 'dist/app.js')))
      throw new Error('Build API dependencies first with pnpm build:apis')
  if (options.database === 'postgres') {
    const { parseRestEnv } = await import('@allmaps/env/rest')
    parseRestEnv(environment)
    const target = postgresTarget(environment.DATABASE_URL)
    console.log(`PostgreSQL: ${target.label}`)
  }
  // Load compiled API modules only after help and build checks have succeeded.
  const { runApis } = await import('./serve.ts')
  await runApis({
    database: options.database,
    dataDir,
    environment,
    seedOnly: options.command === 'seed',
    fixturePort: options.database === 'pglite' ? ports.iiif : undefined
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  void createApiCommand()
    .parseAsync(process.argv)
    .catch((error) => {
      if (error instanceof CommanderError) process.exitCode = error.exitCode
      else {
        console.error(safeError(error))
        process.exitCode = 1
      }
    })
