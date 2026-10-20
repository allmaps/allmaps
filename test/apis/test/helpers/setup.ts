import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll } from 'vitest'
import { installIsolation } from './isolation.ts'

const directory = await mkdtemp(join(tmpdir(), 'allmaps-api-tests-'))
const restore = installIsolation(directory)
afterAll(async () => {
  try {
    await rm(directory, { recursive: true, force: true })
  } finally {
    restore()
  }
})
