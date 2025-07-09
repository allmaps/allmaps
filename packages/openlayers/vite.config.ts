import { defineConfig, type PluginOption, type UserConfig } from 'vite'
import noBundlePlugin from 'vite-plugin-no-bundle'
import dts from 'vite-plugin-dts'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  base: './',
  server: {
    port: ports.openlayers
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: './src/index.ts',
      formats: ['es']
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022'
    }
  },
  plugins: [
    dts(),
    // TODO: find a way to remove type cast
    noBundlePlugin() as PluginOption
  ]
}) satisfies UserConfig
