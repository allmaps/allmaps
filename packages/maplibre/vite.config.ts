import { defineConfig, type PluginOption } from 'vite'
import { exec } from 'child_process'

// import ports from '../../ports.json'

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
    // port: ports.maplibre
    port: 5570
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: false,
    // minify: false,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) =>
        `bundled/allmaps-maplibre.${format}.${format === 'umd' ? 'cjs' : 'js'}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
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
