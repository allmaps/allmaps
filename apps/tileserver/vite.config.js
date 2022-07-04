import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      formats: ['es'],
      entry: './src/worker.ts',
      name: 'allmaps-tile-server',
      fileName: (format) => `worker.${format}.js`
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  base: ''
})
