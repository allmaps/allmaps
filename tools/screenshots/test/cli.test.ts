import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { afterAll, beforeAll, expect, test } from 'vitest'

const executeFile = promisify(execFile)
const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url))
let directory: string

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'screenshot-cli-'))
  await mkdir(path.join(directory, '.screenshots'))
  await writeFile(
    path.join(directory, '.screenshots/manifest.json'),
    JSON.stringify({ version: 1, screenshots: [] })
  )
  await writeFile(
    path.join(directory, 'populated.json'),
    JSON.stringify({
      version: 1,
      screenshots: [{ slug: 'viewer', url: 'https://example.org' }]
    })
  )
})

afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true })
})

async function run(args: string[], environment: Record<string, string> = {}) {
  try {
    const result = await executeFile(process.execPath, [cli, ...args], {
      cwd: directory,
      env: { ...process.env, ...environment },
      timeout: 10_000
    })
    return { ...result, code: 0 }
  } catch (error) {
    const result = error as { stdout: string; stderr: string; code: number }
    return { stdout: result.stdout, stderr: result.stderr, code: result.code }
  }
}

test.each(['--help', '-h'])(
  'prints generated help and exits successfully for %s',
  async (flag) => {
    const result = await run([flag])
    expect(result.code).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Usage: pnpm screenshots [options]')
    expect(result.stdout).toContain('.screenshots/manifest.json')
    expect(result.stdout).toContain('30000')
    expect(result.stdout).toContain('ALLMAPS_ASSETS_CLI')
    expect(result.stdout).toContain('--overwrite')
  }
)

test('uses the default manifest and exits without a browser for an empty collection', async () => {
  const result = await run([])
  expect(result.code).toBe(0)
  expect(result.stderr).toBe('')
  expect(result.stdout).toContain('No screenshots were registered')
})

test.each([
  [['--unknown'], 'unknown option'],
  [['extra'], 'too many arguments'],
  [['--manifest'], 'argument missing'],
  [['--timeout', '0'], 'must be between 1 and 120000'],
  [['--timeout', '120001'], 'must be between 1 and 120000'],
  [['--timeout', 'not-a-number'], 'must be between 1 and 120000'],
  [['--overwrite'], '--overwrite requires --upload'],
  [['--slug', 'missing'], 'Unknown screenshot slug: missing']
])('rejects %j before capturing or uploading', async (args, message) => {
  const result = await run(args)
  expect(result.code).toBe(1)
  expect(result.stdout).toBe('')
  expect(result.stderr).toContain(message)
  expect(result.stderr.split(message)).toHaveLength(2)
})

test('takes the Assets CLI from the environment, with an explicit flag taking precedence', async () => {
  const environment = {
    ALLMAPS_ASSETS_CLI: path.join(directory, 'env-assets.ts')
  }
  const args = ['--manifest', 'populated.json', '--upload']
  const fromEnvironment = await run(args, environment)
  expect(fromEnvironment.code).toBe(1)
  expect(fromEnvironment.stderr).toContain('env-assets.ts')
  const fromFlag = await run(
    [...args, '--assets-cli', path.join(directory, 'flag-assets.ts')],
    environment
  )
  expect(fromFlag.code).toBe(1)
  expect(fromFlag.stderr).toContain('flag-assets.ts')
  expect(fromFlag.stderr).not.toContain('env-assets.ts')
})
