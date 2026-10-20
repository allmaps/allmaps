import { randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
import { Command, CommanderError, Option } from '@commander-js/extra-typings'
import {
  validateLocalEnvironment,
  loadLocalEnvironment,
  root,
  postgresTarget,
  safeError
} from './environment.ts'
import { prompt } from './prompt.ts'

const filename = '.env.localhost.local'

async function readLocalFile(path: string) {
  try {
    if (!(await lstat(path)).isFile())
      throw new Error(`${filename} must be a regular file, not a symbolic link`)
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

function assignment(key: string, value: string) {
  const quote = ["'", '"'].find((character) => !value.includes(character))
  if (!quote || /[\r\n\0]/.test(value))
    throw new Error(
      `${key} must be a single line without mixed quotation marks`
    )
  const line = `${key}=${quote}${value}${quote}`
  if (parseEnv(line)[key] !== value)
    throw new Error(`${key} cannot be saved as an environment variable`)
  return line
}

export async function setupEnvironment({
  database = 'pglite',
  directory = root,
  overrides = process.env,
  ask = prompt,
  log = console.log
}: {
  database?: 'pglite' | 'postgres'
  directory?: string
  overrides?: Record<string, string | undefined>
  ask?: (question: string, hidden?: boolean) => Promise<string>
  log?: (message: string) => void
} = {}) {
  const path = join(directory, filename)
  const original = await readLocalFile(path)
  const values = loadLocalEnvironment(directory, overrides)
  validateLocalEnvironment(values)
  const additions: Record<string, string> = {}
  const add = (key: string, value: string) => {
    if (!values[key]) values[key] = additions[key] = value
  }
  const required = async (key: string, hidden = false) => {
    if (values[key]) return
    for (;;) {
      const value = (await ask(key, hidden)).trim()
      if (value) {
        // Validate before saving anything, without including secrets in errors.
        assignment(key, value)
        add(key, value)
        return
      }
      log(`${key} cannot be empty.`)
    }
  }

  log(
    `Configure ${database === 'pglite' ? 'local PGlite' : 'PostgreSQL'} in ${filename}.`
  )
  log(
    'Existing settings are kept. Shell variables take precedence and are not copied to the file.'
  )
  if (database === 'postgres') {
    log('Use a development database URL, never main or production.')
    await required('DATABASE_URL', true)
    const target = postgresTarget(values.DATABASE_URL)
    log(`Database: ${target.label}`)
  }
  add('BETTER_AUTH_SECRET', randomBytes(32).toString('hex'))

  let github = Boolean(values.GITHUB_CLIENT_ID || values.GITHUB_CLIENT_SECRET)
  if (!github) {
    for (;;) {
      const answer = (await ask('Enable GitHub login? [y/N]'))
        .trim()
        .toLowerCase()
      if (['', 'n', 'no', 'y', 'yes'].includes(answer)) {
        github = answer === 'y' || answer === 'yes'
        break
      }
      log('Enter yes or no.')
    }
  }
  if (github) {
    await required('GITHUB_CLIENT_ID')
    await required('GITHUB_CLIENT_SECRET', true)
  }

  const keys = Object.keys(additions)
  if (keys.length) {
    const newline = original.includes('\r\n') ? '\r\n' : '\n'
    const content =
      (original && !original.endsWith('\n') ? newline : '') +
      `${newline}# Added by pnpm setup:env${newline}` +
      Object.entries(additions)
        .map(([key, value]) => assignment(key, value))
        .join(newline) +
      newline
    const saved = parseEnv(original + content)
    if (Object.entries(additions).some(([key, value]) => saved[key] !== value))
      throw new Error(
        `${filename} contains an unfinished quoted value; fix it before running setup`
      )
    if ((await readLocalFile(path)) !== original)
      throw new Error(`${filename} changed during setup; rerun setup:env`)
    const file = await open(
      path,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_APPEND |
        constants.O_NOFOLLOW,
      0o600
    )
    try {
      await file.chmod(0o600)
      await file.writeFile(content)
    } finally {
      await file.close()
    }
    log(`Saved ${keys.join(', ')} in ${filename}.`)
  } else {
    log('All settings are already configured; no files changed.')
  }
  log(`GitHub login: ${github ? 'enabled' : 'disabled'}.`)
  log(
    `Start APIs: pnpm dev:apis${database === 'postgres' ? ' --db=postgres' : ''}`
  )
  log('Start an app separately, for example: pnpm --filter @allmaps/editor dev')
  return { path, keys }
}

export function createSetupCommand(setup = setupEnvironment) {
  return new Command()
    .name('pnpm setup:env')
    .description('Configure missing local app and API environment settings')
    .exitOverride()
    .addOption(
      new Option('--db <database>', 'Database to configure')
        .choices(['pglite', 'postgres'] as const)
        .default('pglite')
    )
    .action(async ({ db }) => {
      await setup({ database: db })
    })
    .addHelpText(
      'after',
      `
PostgreSQL asks for a development DATABASE_URL if missing.
Generates a missing BETTER_AUTH_SECRET and offers optional GitHub login.
Reads .env.localhost, .env.localhost.local, then shell variables.
Appends missing settings to .env.localhost.local, preserving existing values and comments.
Secret input is hidden. Ctrl+C cancels before any file is written.
Runs directly with Node 24+; no API build is needed.
Does not connect to databases, apply migrations, or start servers.`
    )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  void createSetupCommand()
    .parseAsync(process.argv)
    .catch((error) => {
      if (error instanceof CommanderError) process.exitCode = error.exitCode
      else {
        console.error(safeError(error))
        process.exitCode = 1
      }
    })
