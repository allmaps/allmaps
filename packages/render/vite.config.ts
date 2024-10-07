import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import noBundlePlugin from 'vite-plugin-no-bundle'
import dts from 'vite-plugin-dts'

import ports from '../../ports.json'

export default defineConfig({
  server: {
    port: ports.render
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: './src/index.ts',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        '@allmaps/annotation',
        '@allmaps/id',
        '@allmaps/iiif-parser',
        '@allmaps/transform',
        '@allmaps/triangulate',
        '@allmaps/stdlib',
        'rbush'
      ],
      output: {
        globals: {
          '@allmaps/annotation': '@allmaps/annotation',
          '@allmaps/id': '@allmaps/id',
          '@allmaps/iiif-parser': '@allmaps/iiif-parser',
          '@allmaps/transform': '@allmaps/transform',
          '@allmaps/triangulate': '@allmaps/triangulate',
          '@allmaps/stdlib': '@allmaps/stdlib',
          rbush: 'rbush'
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
  plugins: [
    glsl(),
    dts({
      insertTypesEntry: true
    }),
    noBundlePlugin()
  ],

  define: {
    // To fix error "Uncaught ReferenceError: global is not defined" in poly2tri.js, add this:
    global: 'globalThis'
  }
})
