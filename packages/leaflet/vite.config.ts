import { defineConfig, type PluginOption } from 'vite'
import { exec } from 'child_process'
import { defineConfig, type PluginOption, type UserConfig } from 'vite'

import ports from '../../ports.json' with { type: 'json' }

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
    port: ports.leaflet
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => `bundled/allmaps-leaflet-1.9.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: {
          leaflet: 'L'
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
  plugins: [buildTypes]
}) satisfies UserConfig
