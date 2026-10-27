import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'
import { registrationModule, screenshotIntegration } from './integration.ts'
import type { ScreenshotIntegrationOptions } from './integration.ts'
import { writeManifest } from './manifest.ts'

/** Astro 7: collect only the prerender environment, never the deployed server. */
export function screenshots(options: ScreenshotIntegrationOptions = {}) {
  let root: string
  let collection: { directory: string; manifest: string } | undefined

  function cleanup() {
    process.removeListener('exit', cleanup)
    if (collection) {
      rmSync(collection.directory, { recursive: true, force: true })
      collection = undefined
    }
  }

  const plugin = screenshotIntegration(options, (environment) =>
    environment.name === 'prerender' && collection
      ? registrationModule(collection.directory, 'astro')
      : undefined
  )
  // Bundling failures have a Vite hook; page-render failures may only reach exit.
  plugin.buildEnd = (error) => {
    if (error) cleanup()
  }

  return {
    name: 'allmaps-screenshots',
    hooks: {
      // Structural hook types keep Astro optional for SvelteKit-only consumers.
      'astro:config:setup': ({
        updateConfig
      }: {
        updateConfig: (config: { vite: { plugins: Plugin[] } }) => unknown
      }) => {
        updateConfig({ vite: { plugins: [plugin] } })
      },
      'astro:config:done': ({ config }: { config: { root: URL } }) => {
        root = fileURLToPath(config.root)
      },
      'astro:build:start': () => {
        cleanup()
        const manifest = path.resolve(
          root,
          options.manifest ?? '.screenshots/manifest.json'
        )
        // Remove stale output before starting a new attempt, including failed builds.
        rmSync(manifest, { force: true })
        collection = {
          directory: mkdtempSync(
            path.join(tmpdir(), 'allmaps-screenshots-astro-')
          ),
          manifest
        }
        process.once('exit', cleanup)
      },
      'astro:build:done': async ({
        logger
      }: {
        logger: { info: (message: string) => void }
      }) => {
        if (!collection) return
        try {
          const manifest = await writeManifest(
            collection.directory,
            collection.manifest
          )
          logger.info(
            `Collected ${manifest.screenshots.length} screenshots in ${collection.manifest}`
          )
        } finally {
          cleanup()
        }
      }
    }
  }
}
