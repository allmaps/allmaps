import { fileURLToPath } from 'node:url'

/** @returns {import('astro').AstroIntegration} */
export function mapExampleDependencies() {
  return {
    name: 'allmaps-map-example-dependencies',
    hooks: {
      'astro:config:setup': ({ command, config, updateConfig }) => {
        updateConfig({
          vite: {
            // Astro check/sync starts a temporary Vite server with different
            // optimizer settings. Keep it from replacing the live dev cache.
            ...(command === 'sync'
              ? {
                  cacheDir: fileURLToPath(
                    new URL('node_modules/.vite-sync/', config.root)
                  )
                }
              : {}),
            optimizeDeps: {
              // Prepare lazy imports on the server before the first switch.
              // The browser still downloads each library only when selected.
              include: [
                '@allmaps/ui > leaflet',
                '@allmaps/ui > maplibre-gl',
                '@allmaps/ui > ol/Map.js',
                '@allmaps/ui > ol/View.js',
                '@allmaps/ui > ol/layer/Tile.js',
                '@allmaps/ui > ol/source/OSM.js',
                '@allmaps/ui > ol/interaction/defaults.js',
                '@allmaps/ui > ol/proj.js',
                '@allmaps/ui > ol/layer/Layer.js',
                '@allmaps/ui > ol/events/Event.js'
              ]
            }
          }
        })
      }
    }
  }
}
