import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    // minify: false,
    sourcemap: true,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => `allmaps-openlayers-6.${format}.js`,
      formats: ['umd']
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
    // assetsDir: ''
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  base: ''
})
