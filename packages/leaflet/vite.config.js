import { defineConfig } from 'vite'

import ports from '../../ports.json'

/** @type {import('vite').UserConfig} */
export default defineConfig({
  server: {
    // port: ports.leaflet
    port: 5509
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => `allmaps-leaflet-1.9.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['L', 'GridLayer'],
      output: {
        globals: {
          L: 'L',
          GridLayer: 'L.GridLayer'
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  base: ''
})
