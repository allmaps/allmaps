import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { resolveConfig } from 'vite'
import { mapExampleDependencies } from '../src/plugins/map-example-dependencies.mjs'

const root = new URL('../', import.meta.url)

function configuration(command) {
  let updated
  mapExampleDependencies().hooks['astro:config:setup']({
    command,
    config: { root },
    updateConfig: (config) => (updated = config)
  })
  return updated.vite
}

test('Astro checks use a separate optimizer cache without moving the dev cache', () => {
  assert.equal(configuration('dev').cacheDir, undefined)
  assert.equal(
    configuration('sync').cacheDir,
    fileURLToPath(new URL('node_modules/.vite-sync/', root))
  )
})

test('lazy mapping dependencies resolve through the UI workspace under PNPM', async () => {
  const config = await resolveConfig(
    { root: fileURLToPath(root), configFile: false },
    'serve'
  )
  const resolve = config.createResolver()
  for (const dependency of configuration('dev').optimizeDeps.include) {
    const [workspace, specifier] = dependency.split(' > ')
    const importer = await resolve(workspace)
    assert.ok(importer, workspace)
    assert.ok(await resolve(specifier, importer), dependency)
  }
})
