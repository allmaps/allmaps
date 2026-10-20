import net from 'node:net'
import tls from 'node:tls'
import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { lstatSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import type { PGliteOptions } from '@electric-sql/pglite'
import ports from '../../../../ports.json' with { type: 'json' }

let root: string | undefined
const allowedPorts = new Set<number>()
const developmentPorts = new Set<number>(Object.values(ports))

export function testDirectory() {
  if (!root) throw new Error('API test isolation has not been installed')
  return root
}

export function assertTemporaryPath(path: string) {
  const directory = testDirectory()
  const resolved = resolve(path)
  const within = (candidate: string) => {
    const child = relative(directory, candidate)
    return child !== '' && !child.startsWith('..') && !isAbsolute(child)
  }
  const fail = () => {
    throw new Error(
      'API tests may only open databases in their temporary directory'
    )
  }
  if (!within(resolved)) fail()
  let ancestor = resolved
  for (;;) {
    try {
      lstatSync(ancestor)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      ancestor = dirname(ancestor)
    }
  }
  // lstat also finds dangling symlinks. Their targets must not be created
  // outside the temporary root by PGlite's directory initialization.
  let actual: string
  try {
    actual = realpathSync(ancestor)
  } catch {
    return fail()
  }
  if (actual !== directory && !within(actual)) fail()
}

export function allowTestPort(port: number) {
  if (
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    developmentPorts.has(port)
  )
    throw new Error(
      'API tests must use temporary ports, never development ports'
    )
  allowedPorts.add(port)
}

function assertConnection(host: unknown, port: unknown) {
  if (
    !['localhost', '127.0.0.1', '::1'].includes(String(host)) ||
    !allowedPorts.has(Number(port))
  )
    throw new Error(
      'API tests may only connect to their own temporary local servers'
    )
}

export function installIsolation(directory: string) {
  if (root) throw new Error('API test isolation is already installed')
  root = realpathSync(directory)
  const originalEnvironment = { ...process.env }
  const originalProcesses = {
    exec: childProcess.exec,
    execFile: childProcess.execFile,
    execSync: childProcess.execSync,
    execFileSync: childProcess.execFileSync,
    spawn: childProcess.spawn,
    spawnSync: childProcess.spawnSync,
    fork: childProcess.fork
  }
  const tlsConnect = tls.connect
  const pgliteCreate = PGlite.create
  for (const name of Object.keys(process.env))
    if (
      /^(?:DATABASE_URL$|DIRECT_DATABASE_URL$|PGLITE_DATA_DIR$|NEON|PG|BETTER_AUTH|PUBLIC_.*_BASE_URL$)/.test(
        name
      )
    )
      delete process.env[name]

  const connect = net.Socket.prototype.connect
  net.Socket.prototype.connect = function (
    this: net.Socket,
    ...args: unknown[]
  ) {
    const first = Array.isArray(args[0]) ? args[0][0] : args[0]
    const options =
      typeof first === 'object' && first !== null
        ? (first as { host?: string; port?: number; path?: string })
        : {
            port: first,
            host: typeof args[1] === 'string' ? args[1] : 'localhost'
          }
    assertConnection(options.host ?? 'localhost', options.port)
    return Reflect.apply(connect, this, args)
  } as typeof connect

  // PostgreSQL TLS and all external HTTPS traffic are forbidden in this suite.
  const forbiddenProcess = () => {
    throw new Error('API tests cannot run external commands')
  }
  tls.connect = (() => {
    throw new Error('API tests cannot open TLS connections')
  }) as typeof tls.connect

  childProcess.execFileSync =
    forbiddenProcess as typeof childProcess.execFileSync
  childProcess.exec = forbiddenProcess as unknown as typeof childProcess.exec
  childProcess.execFile =
    forbiddenProcess as unknown as typeof childProcess.execFile
  childProcess.execSync = forbiddenProcess as typeof childProcess.execSync
  childProcess.spawnSync = forbiddenProcess as typeof childProcess.spawnSync
  childProcess.fork = forbiddenProcess as typeof childProcess.fork

  const spawn = childProcess.spawn
  const entrypoint = fileURLToPath(
    new URL('./runner-entrypoint.ts', import.meta.url)
  )
  const preload = fileURLToPath(new URL('./runner-setup.ts', import.meta.url))
  childProcess.spawn = ((
    executable: string,
    args: string[],
    options: childProcess.SpawnOptions
  ) => {
    if (
      executable !== process.execPath ||
      options?.env?.ALLMAPS_API_TEST_ROOT !== root ||
      JSON.stringify(args) !== JSON.stringify(['--import', preload, entrypoint])
    )
      return forbiddenProcess()
    return spawn(executable, args, options)
  }) as typeof spawn
  syncBuiltinESMExports()

  PGlite.create = ((first?: string | PGliteOptions, second?: PGliteOptions) => {
    for (const dataDir of [
      typeof first === 'string' ? first : first?.dataDir,
      second?.dataDir
    ])
      if (dataDir && dataDir !== 'memory://') assertTemporaryPath(dataDir)
    return Reflect.apply(pgliteCreate, PGlite, [first, second])
  }) as typeof PGlite.create
  return () => {
    net.Socket.prototype.connect = connect
    tls.connect = tlsConnect
    Object.assign(childProcess, originalProcesses)
    PGlite.create = pgliteCreate
    for (const [name, value] of Object.entries(originalEnvironment))
      if (
        /^(?:DATABASE_URL$|DIRECT_DATABASE_URL$|PGLITE_DATA_DIR$|NEON|PG|BETTER_AUTH|PUBLIC_.*_BASE_URL$)/.test(
          name
        )
      )
        process.env[name] = value
    syncBuiltinESMExports()
    allowedPorts.clear()
    root = undefined
  }
}

export function assertRunnerConfiguration(configuration: {
  database: string
  dataDir?: string
  environment: Record<string, string | undefined>
  fixturePort?: number
  migrationsDirectory?: string
  reuseFixtureServer?: boolean
}) {
  if (configuration.database !== 'pglite' || !configuration.dataDir)
    throw new Error('API tests can only start temporary PGlite databases')
  assertTemporaryPath(configuration.dataDir)
  if (!configuration.migrationsDirectory)
    throw new Error('Runner tests require a temporary copy of the migrations')
  assertTemporaryPath(configuration.migrationsDirectory)
  if (configuration.reuseFixtureServer !== false)
    throw new Error('API tests must own their fixture server')
  for (const key of [
    'PUBLIC_REST_BASE_URL',
    'PUBLIC_ANNOTATIONS_BASE_URL',
    'PUBLIC_LIVE_BASE_URL'
  ]) {
    const url = new URL(configuration.environment[key]!)
    if (url.protocol !== 'http:')
      throw new Error('API tests require local HTTP')
    assertConnection(url.hostname.replace(/^\[|\]$/g, ''), url.port)
  }
  assertConnection('127.0.0.1', configuration.fixturePort)
}
