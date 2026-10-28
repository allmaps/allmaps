import { mkdtempSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { writeManifest } from './manifest.ts'
import { registrationModule, screenshotIntegration } from './integration.ts'
import type { ScreenshotIntegrationOptions } from './integration.ts'

export { registrationModule } from './integration.ts'

import type { Plugin } from 'vite'

type Collection = {
  directory: string
  manifest: string
}

/** Collect resolved Screenshot props during SvelteKit prerendering. */
export function screenshots(
  options: ScreenshotIntegrationOptions = {}
): Plugin {
  const collections = new WeakMap<object, Collection>()
  return {
    ...screenshotIntegration(options, (environment) => {
      const collection = collections.get(environment)
      return collection ? registrationModule(collection.directory) : undefined
    }),
    async buildStart() {
      const config = this.environment.config
      if (config.command !== 'build' || !config.build.ssr) return
      const collection = {
        directory: mkdtempSync(path.join(tmpdir(), 'allmaps-screenshots-')),
        manifest: path.resolve(
          config.root,
          options.manifest ?? '.screenshots/manifest.json'
        )
      }
      collections.set(this.environment, collection)
      // A failed build must not leave a previous build's registry looking current.
      await rm(collection.manifest, { force: true })
    },
    writeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        // SvelteKit completes prerendering in its writeBundle hook. Its nested
        // client build has no collection and must not publish an empty manifest.
        const collection = collections.get(this.environment)
        if (!collection) return
        const manifest = await writeManifest(
          collection.directory,
          collection.manifest
        )
        this.environment.logger.info(
          `Collected ${manifest.screenshots.length} screenshots in ${collection.manifest}`
        )
      }
    },
    closeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        const collection = collections.get(this.environment)
        if (collection) {
          await rm(collection.directory, { recursive: true, force: true })
          collections.delete(this.environment)
        }
      }
    }
  }
}
