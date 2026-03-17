import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'

function takeFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  if (index === -1) {
    return undefined
  }

  const value = args[index + 1]
  if (!value) {
    throw new Error(`Missing value for ${flag}`)
  }

  args.splice(index, 2)
  return value
}

function takeAllFlags(args: string[], flag: string): string[] {
  const values: string[] = []

  while (true) {
    const index = args.indexOf(flag)
    if (index === -1) {
      return values
    }

    const value = args[index + 1]
    if (!value) {
      throw new Error(`Missing value for ${flag}`)
    }

    values.push(value)
    args.splice(index, 2)
  }
}

const argv = process.argv.slice(2)
const separatorIndex = argv.indexOf('--')
const passthroughArgs =
  separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1)
const args = separatorIndex === -1 ? [...argv] : argv.slice(0, separatorIndex)

const cwd = takeFlag(args, '--cwd')
if (!cwd) {
  throw new Error('Missing required flag: --cwd')
}

const wranglerEnv = takeFlag(args, '--wrangler-env')
const envFiles = takeAllFlags(args, '--dotenv-file')

// console.log('daslkdjasoidjaso', envFiles)

if (envFiles.length === 0) {
  throw new Error('Provide at least one --env-file')
}

if (args.length > 0) {
  throw new Error(`Unknown arguments: ${args.join(' ')}`)
}

const mergedEnv: Record<string, string> = {}

for (const envFile of envFiles) {
  const absolutePath = resolve(envFile)
  if (!existsSync(absolutePath)) {
    continue
  }

  const parsedEnv = parseEnv(readFileSync(absolutePath, 'utf8'))
  Object.assign(mergedEnv, parsedEnv)
}

const varArgs: string[] = []

for (const [key, value] of Object.entries(mergedEnv).sort(([a], [b]) =>
  a.localeCompare(b)
)) {
  if (value === '') {
    continue
  }

  varArgs.push('--var', `${key}:${value}`)
}

const commandArgs = [
  'exec',
  'wrangler',
  'deploy',
  ...(wranglerEnv ? ['--env', wranglerEnv] : []),
  ...varArgs,
  ...passthroughArgs
]

const result = spawnSync('pnpm', commandArgs, {
  cwd: resolve(cwd),
  stdio: 'inherit'
})

process.exit(result.status ?? 1)
