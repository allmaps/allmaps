import { defineConfig, type PluginOption } from 'vite'
import { exec } from 'child_process'

import ports from '../../ports.json'

// Create TypeScript definition files
// TODO: move to @allmaps/stdlib?
const buildTypes: PluginOption = {
  name: 'build:types',
  buildEnd: (error) => {
    if (!error) {
      return new Promise((resolve, reject) => {
        exec('npm run build:types', (err) => (err ? reject(err) : resolve()))
      })
    }
  }
}

export default defineConfig({
  server: {
    port: ports.openlayers
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => `bundled/allmaps-openlayers-8.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [
        'ol/View.js',
        'ol/layer/Layer.js',
        'ol/layer/Tile.js',
        'ol/source/IIIF.js',
        'ol/format/IIIFInfo.js',
        'ol/Object.js',
        'ol/events/Event.js',
        'ol/proj.js',
        'ol/transform.js'
      ],
      output: {
        globals: {
          'ol/View.js': 'ol.View',
          'ol/layer/Layer.js': 'ol.layer.Layer',
          'ol/layer/Tile.js': 'ol.layer.Tile',
          'ol/source/IIIF.js': 'ol.source.IIIF',
          'ol/format/IIIFInfo.js': 'ol.format.IIIFInfo',
          'ol/Object.js': 'ol.Object',
          'ol/events/Event.js': 'ol.events.Event',
          'ol/proj.js': 'ol.proj',
          'ol/transform.js': 'ol.transform'
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022'
    }
  },
  base: '',
  plugins: [buildTypes],
  define: {
    // To fix error "Uncaught ReferenceError: global is not defined" in poly2tri.js, add this:
    global: 'globalThis'
  }
})
