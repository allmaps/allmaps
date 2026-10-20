import { fileURLToPath } from 'node:url'
import { loadLocalEnvironment } from '@allmaps/tools-setup'

const directory = fileURLToPath(new URL('../fixtures/', import.meta.url))
export const testEnvironmentFile = new URL(
  '../fixtures/.env.localhost',
  import.meta.url
)

export function createTestEnvironment(
  overrides: Record<string, string | undefined> = {}
) {
  return loadLocalEnvironment(directory, overrides)
}
