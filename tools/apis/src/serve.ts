import { createPgliteContext, createPostgresContext } from './context.ts'
import type { RunningContext } from './context.ts'
import { openServers, assertAvailable, fixtureAvailable } from './servers.ts'

export type RunnerConfiguration = {
  database: 'pglite' | 'postgres'
  dataDir?: string
  environment: Record<string, string | undefined>
  seedOnly?: boolean
  fixturePort?: number
  reuseFixtureServer?: boolean
  migrationsDirectory?: string
}

export async function runApis(configuration: RunnerConfiguration) {
  const { environment } = configuration
  let context: RunningContext | undefined
  let servers: Awaited<ReturnType<typeof openServers>> | undefined
  let stopping = false
  const stopped = Promise.withResolvers<void>()
  const stop = () => {
    if (stopping) return
    stopping = true
    console.log('\nStopping APIs…')
    stopped.resolve()
  }
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, stop)
  try {
    let reuseFixture = false
    if (!configuration.seedOnly) {
      for (const key of [
        'PUBLIC_REST_BASE_URL',
        'PUBLIC_ANNOTATIONS_BASE_URL',
        'PUBLIC_LIVE_BASE_URL'
      ]) {
        const url = new URL(environment[key]!)
        await assertAvailable(
          Number(url.port || 80),
          url.hostname.replace(/^\[|\]$/g, '')
        )
      }
      if (configuration.fixturePort !== undefined) {
        if (configuration.reuseFixtureServer === false) {
          for (const hostname of ['localhost', '127.0.0.1'])
            await assertAvailable(configuration.fixturePort, hostname)
        } else reuseFixture = await fixtureAvailable(configuration.fixturePort)
      }
    }
    if (stopping) return
    console.log(`Opening ${configuration.database} database...`)
    context =
      configuration.database === 'pglite'
        ? await createPgliteContext({
            dataDir: configuration.dataDir,
            environment,
            seed: 'demo',
            fixturePort: configuration.fixturePort,
            migrationsDirectory: configuration.migrationsDirectory
          })
        : await createPostgresContext(environment)
    // A signal during initialization lets the transaction finish before closing.
    if (stopping) return
    if (!configuration.seedOnly)
      servers = await openServers(
        context,
        configuration.fixturePort,
        reuseFixture
      )
    console.log(`${configuration.database} ready`)
    if (!configuration.seedOnly) {
      console.log(
        `REST: ${environment.PUBLIC_REST_BASE_URL}\nAnnotations: ${environment.PUBLIC_ANNOTATIONS_BASE_URL}\nLive: ${environment.PUBLIC_LIVE_BASE_URL}`
      )
      await stopped.promise
    }
  } finally {
    try {
      try {
        await servers?.close()
      } finally {
        await context?.close()
      }
      if (stopping) console.log('APIs stopped.')
    } finally {
      for (const signal of ['SIGINT', 'SIGTERM'] as const)
        process.off(signal, stop)
    }
  }
}
