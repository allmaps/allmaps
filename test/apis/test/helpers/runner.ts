import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { RunnerConfiguration } from '@allmaps/tools-apis'
import { testDirectory } from './isolation.ts'

// Process management belongs to the native Node tests, not the development tool.
export function startRunner(
  configuration: RunnerConfiguration,
  ports: number[]
) {
  const child = spawn(
    process.execPath,
    [
      '--import',
      fileURLToPath(new URL('./runner-setup.ts', import.meta.url)),
      fileURLToPath(new URL('./runner-entrypoint.ts', import.meta.url))
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'test',
        ALLMAPS_API_TEST_ROOT: testDirectory(),
        ALLMAPS_API_TEST_PORTS: JSON.stringify(ports),
        ALLMAPS_API_TEST_CONFIGURATION: JSON.stringify(configuration)
      }
    }
  )
  const ready = Promise.withResolvers<boolean>()
  const initializing = Promise.withResolvers<boolean>()
  const exited = Promise.withResolvers<number | null>()
  let output = ''
  child.stdout.on('data', (data) => {
    output += data.toString()
    if (output.includes('Opening pglite database...'))
      initializing.resolve(true)
    if (output.includes('pglite ready')) ready.resolve(true)
  })
  child.stderr.on('data', (data) => {
    output += data.toString()
  })
  child.on('error', (error) => {
    output += error.message
  })
  child.on('close', (code) => {
    ready.resolve(false)
    initializing.resolve(false)
    exited.resolve(code)
  })
  return {
    ready: ready.promise,
    initializing: initializing.promise,
    exited: exited.promise,
    get output() {
      return output
    },
    async stop(signal: NodeJS.Signals = 'SIGTERM') {
      if (child.exitCode === null && child.signalCode === null)
        child.kill(signal)
      return exited.promise
    }
  }
}
