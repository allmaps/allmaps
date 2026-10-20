import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import {
  createPgliteContext,
  apiEnvironment,
  type PgliteContext,
  type RunnerConfiguration
} from '@allmaps/tools-apis'
import { startRunner } from './runner.ts'
import {
  assertTemporaryPath,
  testDirectory,
  allowTestPort,
  assertRunnerConfiguration
} from './isolation.ts'
import { createTestEnvironment } from './environment.ts'
import { fixtureMap } from '../fixtures/map.ts'

export async function temporaryDirectory(prefix: string) {
  return mkdtemp(join(testDirectory(), prefix))
}

export async function createTestContext(
  options: { dataDir?: string; seed?: 'map' | 'demo' } = {}
) {
  testDirectory()
  if (options.dataDir) assertTemporaryPath(options.dataDir)
  const context = await createPgliteContext({
    dataDir: options.dataDir,
    environment: apiEnvironment(
      createTestEnvironment(),
      'pglite',
      options.dataDir ?? 'api-test'
    ),
    seed: options.seed === 'demo' ? 'demo' : undefined
  })
  try {
    if (options.seed === 'map') {
      await context.shareDb.saveMaps([fixtureMap])
      await context.shareDb.flushPendingSnapshots()
      if (context.shareDb.persistErrors)
        throw new Error('Failed to persist the test map')
    }
    return context
  } catch (error) {
    await context.close()
    throw error
  }
}

export type TestContext = PgliteContext

export function startTestRunner(configuration: RunnerConfiguration) {
  const ports = [
    ...['REST', 'ANNOTATIONS', 'LIVE'].map((name) =>
      Number(
        new URL(configuration.environment[`PUBLIC_${name}_BASE_URL`]!).port
      )
    ),
    configuration.fixturePort!
  ]
  for (const port of ports) allowTestPort(port)
  assertRunnerConfiguration(configuration)
  return startRunner(configuration, ports)
}
