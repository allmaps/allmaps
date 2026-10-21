import type { CommandUnknownOpts } from '@commander-js/extra-typings'
import { describe, expect, it, vi } from 'vitest'
import { createApiCommand } from '@allmaps/tools-apis'
import { createSetupCommand } from '@allmaps/tools-setup'
import { createImportCommand } from '@allmaps/tools-iiif-server/import'

function captureOutput(command: CommandUnknownOpts) {
  let output = ''
  const write = (text: string) => {
    output += text
  }
  function configure(command: CommandUnknownOpts) {
    command.configureOutput({ writeOut: write, writeErr: write })
    for (const child of command.commands) configure(child)
  }
  configure(command)
  return () => output
}

const userArguments = { from: 'user' } as const

describe('API command arguments', () => {
  it.each([
    { args: [], command: 'serve', database: 'pglite' },
    { args: ['--db=pglite'], command: 'serve', database: 'pglite' },
    { args: ['--db=postgres'], command: 'serve', database: 'postgres' },
    { args: ['--db', 'postgres'], command: 'serve', database: 'postgres' },
    {
      args: ['--db=postgres', '--db=pglite'],
      command: 'serve',
      database: 'pglite'
    },
    { args: ['seed'], command: 'seed', database: 'pglite' },
    { args: ['seed', '--db=pglite'], command: 'seed', database: 'pglite' },
    { args: ['migrate', '--db=pglite'], command: 'migrate', database: 'pglite' }
  ])(
    'routes $args without opening a database',
    async ({ args, command, database }) => {
      const run = vi.fn(async () => {})
      const program = createApiCommand(run)
      captureOutput(program)
      await program.parseAsync(args, userArguments)
      expect(run).toHaveBeenCalledExactlyOnceWith({ command, database })
    }
  )

  it.each([
    ['migrate'],
    ['migrate', '--db=postgres'],
    ['migrate', '--db=sqlite'],
    ['migrate', '--db'],
    ['--db=postgres', 'migrate'],
    ['--db=pglite', 'migrate'],
    ['seed', '--db=postgres'],
    ['--db=postgres', 'seed'],
    ['--db=neon'],
    ['--db'],
    ['--fresh'],
    ['--branch'],
    ['cleanup'],
    ['migrate', '--db=pglite', 'unexpected']
  ])('rejects %j before opening a database', async (...args) => {
    const run = vi.fn(async () => {})
    const program = createApiCommand(run)
    captureOutput(program)
    await expect(program.parseAsync(args, userArguments)).rejects.toMatchObject(
      { exitCode: 1 }
    )
    expect(run).not.toHaveBeenCalled()
  })
})

describe('setup command arguments', () => {
  it.each([
    { args: [], database: 'pglite' },
    { args: ['--db=pglite'], database: 'pglite' },
    { args: ['--db=postgres'], database: 'postgres' },
    { args: ['--db', 'postgres'], database: 'postgres' }
  ])(
    'routes $args without prompting or writing settings',
    async ({ args, database }) => {
      const setup = vi.fn(async () => ({ path: 'unused', keys: [] }))
      await createSetupCommand(setup).parseAsync(args, userArguments)
      expect(setup).toHaveBeenCalledExactlyOnceWith({ database })
    }
  )

  it.each([['--db=neon'], ['--db'], ['--unknown'], ['unexpected']])(
    'rejects %j before prompting or writing settings',
    async (...args) => {
      const setup = vi.fn(async () => ({ path: 'unused', keys: [] }))
      const program = createSetupCommand(setup)
      captureOutput(program)
      await expect(
        program.parseAsync(args, userArguments)
      ).rejects.toMatchObject({ exitCode: 1 })
      expect(setup).not.toHaveBeenCalled()
    }
  )
})

describe('IIIF import command arguments', () => {
  it.each([
    { args: ['annotation.json'], options: { input: 'annotation.json' } },
    {
      args: ['annotation.json', '--id', 'my-map', '--label=My map'],
      options: { input: 'annotation.json', id: 'my-map', label: 'My map' }
    },
    { args: ['--', '-annotation.json'], options: { input: '-annotation.json' } }
  ])(
    'routes $args without reading or downloading a fixture',
    async ({ args, options }) => {
      const importFixture = vi.fn(async () => {})
      await createImportCommand(importFixture).parseAsync(args, userArguments)
      expect(importFixture).toHaveBeenCalledExactlyOnceWith(options)
    }
  )

  it.each([
    [],
    ['annotation.json', '--id'],
    ['annotation.json', '--unknown'],
    ['one.json', 'two.json']
  ])('rejects %j before importing fixtures', async (...args) => {
    const importFixture = vi.fn(async () => {})
    const program = createImportCommand(importFixture)
    captureOutput(program)
    await expect(program.parseAsync(args, userArguments)).rejects.toMatchObject(
      { exitCode: 1 }
    )
    expect(importFixture).not.toHaveBeenCalled()
  })
})

it('prints generated help without running any action', async () => {
  const run = vi.fn(async () => {})
  const setup = vi.fn(async () => ({ path: 'unused', keys: [] }))
  const commands: [CommandUnknownOpts, string[], string][] = [
    [createApiCommand(run), ['--help'], 'serve'],
    [createApiCommand(run), ['serve', '--help'], '--db <database>'],
    [createApiCommand(run), ['migrate', '--help'], '--db <database>'],
    [createApiCommand(run), ['seed', '--help'], '--db <database>'],
    [createSetupCommand(setup), ['--help'], '--db <database>'],
    [createImportCommand(run), ['--help'], '--id <image-id>']
  ]
  for (const [program, args, expected] of commands) {
    const output = captureOutput(program)
    await expect(program.parseAsync(args, userArguments)).rejects.toMatchObject(
      {
        code: 'commander.helpDisplayed',
        exitCode: 0
      }
    )
    expect(output()).toContain('Usage:')
    expect(output()).toContain(expected)
  }
  expect(run).not.toHaveBeenCalled()
  expect(setup).not.toHaveBeenCalled()
})
