import path from 'node:path'
import type { Environment, Plugin } from 'vite'
import { previewModule, screenshotPreview } from './preview.ts'

export type ScreenshotIntegrationOptions = {
  /** Relative to the app root. Kept outside the public build directory. */
  manifest?: string
  /** Relative to the app root; match the capture CLI's --output if customized. */
  captures?: string
}

const integrationId = '@allmaps/ui/screenshots/integration'
const moduleId = '\0allmaps:screenshot-integration'

export function registrationModule(
  directory: string,
  framework: 'sveltekit' | 'astro' = 'sveltekit'
) {
  // getBuiltinModule keeps Node filesystem imports out of deployment bundles.
  // This code runs only inside the Node-based build/prerender worker.
  return `
${framework === 'sveltekit' ? "import { building } from '$app/environment'" : ''}
export function registerScreenshot(definition) {
  if (${framework === 'sveltekit' ? 'building' : 'true'}) {
    const { writeFileSync } = process.getBuiltinModule('node:fs')
    const { createHash } = process.getBuiltinModule('node:crypto')
    const content = JSON.stringify(definition)
    const hash = createHash('sha256').update(content).digest('hex')
    writeFileSync(${JSON.stringify(directory + path.sep)} + hash + '.json', content)
  }
  return definition
}
`
}

/** Shared module replacement and local preview; framework hooks own collection. */
export function screenshotIntegration(
  options: ScreenshotIntegrationOptions,
  registrationSource: (environment: Environment) => string | undefined
): Plugin {
  return {
    name: 'allmaps-screenshots',
    enforce: 'pre',
    configureServer(server) {
      const preview = screenshotPreview(
        path.resolve(
          server.config.root,
          options.captures ?? '.screenshots/captures'
        ),
        server.config.base
      )
      server.middlewares.use((request, response, next) => {
        void preview(request, response, next).catch(next)
      })
    },
    resolveId(source, _importer, resolveOptions) {
      if (source === integrationId) {
        return `${moduleId}:${resolveOptions?.ssr ? 'server' : 'client'}`
      }
    },
    load(id) {
      if (id !== `${moduleId}:server` && id !== `${moduleId}:client`) return
      const config = this.environment.config
      const source = id.endsWith(':server')
        ? registrationSource(this.environment)
        : undefined
      const registration =
        source ??
        'export function registerScreenshot(definition) { return definition }'
      const imageUrl =
        config.command === 'serve'
          ? previewModule(config.base)
          : 'export function screenshotImageUrl(key, publishedUrl) { return publishedUrl }'
      return `${registration}\n${imageUrl}`
    }
  }
}
