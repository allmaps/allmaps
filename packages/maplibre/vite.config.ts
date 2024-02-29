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

/** @type {import('vite').UserConfig} */
export default defineConfig({
  server: {
    port: ports.maplibre
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => `bundled/allmaps-maplibre-4.0.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['maplibre-gl'],
      output: {
        globals: {
          'maplibre-gl': 'maplibre-gl'
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  base: '',
  plugins: [buildTypes],
  define: {
    // To fix error "Uncaught ReferenceError: global is not defined" in poly2tri.js, add this:
    global: 'globalThis'
  }
})
