import { readFile, writeFile, stat, readdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { parseEnv } from 'node:util'
import { describe, expect, it, vi } from 'vitest'
import {
  setupEnvironment,
  prompt,
  loadLocalEnvironment,
  postgresTarget
} from '@allmaps/tools-setup'
import { apiEnvironment } from '@allmaps/tools-apis'
import { temporaryDirectory } from './helpers/context.ts'
import {
  createTestEnvironment,
  testEnvironmentFile
} from './helpers/environment.ts'

const databaseUrl =
  'postgresql://developer:secret@database.invalid/maps?sslmode=require'

async function setup(
  options: {
    database?: 'pglite' | 'postgres'
    base?: string
    local?: string
    overrides?: Record<string, string>
    answers?: string[]
  } = {}
) {
  const directory = await temporaryDirectory('setup-')
  const base =
    (await readFile(testEnvironmentFile, 'utf8')) + (options.base ?? '')
  await writeFile(join(directory, '.env.localhost'), base)
  if (options.local !== undefined)
    await writeFile(join(directory, '.env.localhost.local'), options.local)
  const answers = [...(options.answers ?? ['no'])]
  const ask = vi.fn(async () => {
    if (!answers.length) throw new Error('Unexpected setup prompt')
    return answers.shift()!
  })
  const log = vi.fn()
  const run = () =>
    setupEnvironment({
      database: options.database,
      directory,
      overrides: options.overrides ?? {},
      ask,
      log
    })
  return { directory, base, ask, log, run }
}

describe('environment setup with temporary files', () => {
  it('uses the base configuration and writes only a missing secret', async () => {
    const test = await setup()
    const result = await test.run()
    const env = loadLocalEnvironment(test.directory, {})
    expect(env.BETTER_AUTH_SECRET).toMatch(/^[a-f0-9]{64}$/)
    expect(env.PUBLIC_REST_BASE_URL).toBe('http://localhost:5499')
    expect(env.DATABASE_URL).toBeUndefined()
    expect(env.GITHUB_CLIENT_ID).toBeUndefined()
    expect(
      apiEnvironment(env, 'pglite', test.directory).BETTER_AUTH_SECRET
    ).toBe(env.BETTER_AUTH_SECRET)
    expect((await stat(result.path)).mode & 0o777).toBe(0o600)
    expect(result.keys).toEqual(['BETTER_AUTH_SECRET'])
    expect(parseEnv(await readFile(result.path, 'utf8'))).toEqual({
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET
    })
    expect(await readdir(test.directory)).toEqual([
      '.env.localhost',
      '.env.localhost.local'
    ])
    expect(test.log.mock.calls.flat().join('\n')).not.toContain(
      env.BETTER_AUTH_SECRET
    )
  })

  it('preserves existing values, comments, multiline values, CRLF, and a missing final newline', async () => {
    const base =
      '# committed defaults\nPUBLIC_REST_BASE_URL=http://localhost:5599\n'
    const local =
      '# keep this comment\r\nUNRELATED="first\r\nsecond"\r\nBETTER_AUTH_SECRET=existing-secret\r\nDATABASE_URL= # fill this later'
    const test = await setup({
      database: 'postgres',
      base,
      local,
      answers: [databaseUrl, 'no']
    })
    const result = await test.run()
    const content = await readFile(result.path, 'utf8')
    expect(content.startsWith(local)).toBe(true)
    expect(await readFile(join(test.directory, '.env.localhost'), 'utf8')).toBe(
      test.base
    )
    const env = loadLocalEnvironment(test.directory, {})
    expect(env.BETTER_AUTH_SECRET).toBe('existing-secret')
    expect(env.PUBLIC_REST_BASE_URL).toBe('http://localhost:5599')
    expect(env.DATABASE_URL).toBe(databaseUrl)
    expect(env.UNRELATED).toBe(parseEnv(local).UNRELATED)
    expect(test.ask).toHaveBeenCalledWith('DATABASE_URL', true)
    test.ask.mockResolvedValue('no')
    const second = await test.run()
    expect(second.keys).toEqual([])
    expect(await readFile(result.path, 'utf8')).toBe(content)
    expect(test.log.mock.calls.flat().join('\n')).not.toContain(
      'developer:secret'
    )
  })

  it('respects shell settings without persisting them', async () => {
    const test = await setup({
      database: 'postgres',
      overrides: {
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: 'shell-secret',
        GITHUB_CLIENT_ID: 'shell-client',
        GITHUB_CLIENT_SECRET: 'shell-github-secret'
      },
      answers: []
    })
    const result = await test.run()
    expect(test.ask).not.toHaveBeenCalled()
    expect(result.keys).toEqual([])
    expect(await readdir(test.directory)).toEqual(['.env.localhost'])
  })

  it('offers GitHub login and asks only for missing credentials', async () => {
    const test = await setup({
      base: 'GITHUB_CLIENT_ID=existing-client\n',
      answers: ['secret#with"quotes']
    })
    const result = await test.run()
    expect(test.ask.mock.calls).toEqual([['GITHUB_CLIENT_SECRET', true]])
    expect(loadLocalEnvironment(test.directory, {}).GITHUB_CLIENT_SECRET).toBe(
      'secret#with"quotes'
    )
    expect(
      parseEnv(await readFile(result.path, 'utf8')).GITHUB_CLIENT_ID
    ).toBeUndefined()
    expect(test.log.mock.calls.flat().join('\n')).not.toContain('secret#')
  })

  it('can enable GitHub from scratch and preserves credentials on rerun', async () => {
    const test = await setup({ answers: ['yes', 'client', 'github-secret'] })
    const first = await test.run()
    expect(loadLocalEnvironment(test.directory, {})).toMatchObject({
      GITHUB_CLIENT_ID: 'client',
      GITHUB_CLIENT_SECRET: 'github-secret'
    })
    test.ask.mockClear()
    expect((await test.run()).keys).toEqual([])
    expect(test.ask).not.toHaveBeenCalled()
    expect((await stat(first.path)).mode & 0o777).toBe(0o600)
  })

  it('cancels without changing or creating an environment file', async () => {
    for (const local of [undefined, '# keep\nBETTER_AUTH_SECRET=keep\n']) {
      const test = await setup({ local })
      test.ask.mockRejectedValue(new Error('Setup cancelled'))
      await expect(test.run()).rejects.toThrow('cancelled')
      if (local !== undefined)
        expect(
          await readFile(join(test.directory, '.env.localhost.local'), 'utf8')
        ).toBe(local)
      else expect(await readdir(test.directory)).toEqual(['.env.localhost'])
    }
  })

  it('rejects invalid database URLs without writing files or exposing their value', async () => {
    const test = await setup({
      database: 'postgres',
      answers: ['https://secret.invalid/maps']
    })
    await expect(test.run()).rejects.toThrow('DATABASE_URL')
    expect(await readdir(test.directory)).toEqual(['.env.localhost'])
    expect(test.log.mock.calls.flat().join('\n')).not.toContain(
      'secret.invalid'
    )
  })

  it('refuses to overwrite a concurrent edit or follow a local environment symlink', async () => {
    const test = await setup({ local: '# original\n' })
    test.ask.mockImplementation(async () => {
      await writeFile(
        join(test.directory, '.env.localhost.local'),
        '# concurrent edit\n'
      )
      return 'no'
    })
    await expect(test.run()).rejects.toThrow('changed during setup')
    expect(
      await readFile(join(test.directory, '.env.localhost.local'), 'utf8')
    ).toBe('# concurrent edit\n')
    const second = await setup()
    await symlink(
      join(test.directory, '.env.localhost.local'),
      join(second.directory, '.env.localhost.local')
    )
    await expect(second.run()).rejects.toThrow('symbolic link')
    expect(
      await readFile(join(test.directory, '.env.localhost.local'), 'utf8')
    ).toBe('# concurrent edit\n')
  })

  it.each(['', 'invalid', 'https://api.allmaps.org'])(
    'rejects an invalid API origin %j before prompting or writing',
    async (value) => {
      const test = await setup({ overrides: { PUBLIC_LIVE_BASE_URL: value } })
      await expect(test.run()).rejects.toThrow(
        'PUBLIC_LIVE_BASE_URL must be a localhost HTTP origin'
      )
      expect(test.ask).not.toHaveBeenCalled()
      expect(await readdir(test.directory)).toEqual(['.env.localhost'])
    }
  )

  it('requires the base environment file instead of inventing defaults', async () => {
    const directory = await temporaryDirectory('missing-environment-')
    await expect(
      setupEnvironment({ directory, overrides: {} })
    ).rejects.toThrow('.env.localhost')
    expect(await readdir(directory)).toEqual([])
  })

  it('explains setup when PostgreSQL startup is missing DATABASE_URL', () => {
    expect(() => postgresTarget(undefined)).toThrow(
      'pnpm setup:env --db=postgres'
    )
    expect(() =>
      apiEnvironment(createTestEnvironment(), 'postgres', 'unused')
    ).toThrow('.env.localhost.local')
  })
})

describe('terminal prompts', () => {
  it('hides secrets while accepting their exact value', async () => {
    const input = Object.assign(new PassThrough(), { isTTY: true })
    const output = Object.assign(new PassThrough(), { isTTY: true })
    let printed = ''
    output.on('data', (chunk) => {
      printed += chunk.toString()
    })
    try {
      const answer = prompt('DATABASE_URL', true, input, output)
      input.write(`${databaseUrl}\n`)
      await expect(answer).resolves.toBe(databaseUrl)
      expect(printed).toContain('DATABASE_URL (hidden)')
      expect(printed).not.toContain(databaseUrl)
      expect(printed).not.toContain('secret')
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  it.each(['\u0003', 'EOF'])('cancels safely on %j', async (answer) => {
    const input = Object.assign(new PassThrough(), { isTTY: true })
    const output = Object.assign(new PassThrough(), { isTTY: true })
    try {
      const result = expect(
        prompt('Secret', true, input, output)
      ).rejects.toThrow('Setup cancelled')
      if (answer === 'EOF') input.end()
      else input.write(answer)
      await result
      expect(input.isPaused()).toBe(true)
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  it('fails clearly if a prompt is needed without a terminal', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    await expect(prompt('Secret', true, input, output)).rejects.toThrow(
      'interactive terminal'
    )
    input.destroy()
    output.destroy()
  })
})
