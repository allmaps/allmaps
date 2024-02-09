import { defineConfig, type PluginOption } from 'vite'
import { exec } from 'child_process'

// TODO: move to @allmaps/stdlib?
const buildTypes: PluginOption = {
  name: 'build:types',
  buildEnd: (error) => {
    if (!error) {
      return new Promise((resolve, reject) => {
        exec('pnpm run build:types', (err) => (err ? reject(err) : resolve()))
      })
    }
  }
}

export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => `bundled/index.${format}.js`,
      formats: ['es', 'umd']
    }
    // Transform module is bundled with vite to fix ESM errors with ml-matrix.
    // TODO: should some of this module's dependencies be external?
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  base: '',
  plugins: [buildTypes]
})
