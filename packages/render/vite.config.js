import { defineConfig } from 'vite'
import { exec } from 'child_process'

import ports from '../../ports.json'

// TODO: move to @allmaps/stdlib?
const dts = {
  name: 'dts-generator',
  buildEnd: (error) => {
    if (!error) {
      return new Promise((resolve, reject) => {
        exec('npm run build:types', (err) =>
          err ? reject(err) : resolve()
        )
      })
    }
  }
}

/** @type {import('vite').UserConfig} */
export default defineConfig({
  server: {
    port: ports.render
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: false,
    // minify: false,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => {
        if (format === 'umd') {
          return `index.cjs`
        }

        return `index.js`
      },
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [
        '@allmaps/annotation',
        '@allmaps/id',
        '@allmaps/iiif-parser',
        '@allmaps/transform',
        '@allmaps/triangulate',
        '@allmaps/stdlib',
        'potpack',
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
          rbush: 'rbush',
          potpack: 'potpack'
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
  plugins: [dts]
})
