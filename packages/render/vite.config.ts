import { defineConfig, type PluginOption, type UserConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import noBundlePlugin from 'vite-plugin-no-bundle'
import dts from 'vite-plugin-dts'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  base: './',
  server: {
    port: ports.render
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: [
        './src/index.ts',
        './src/canvas.ts',
        './src/intarray.ts',
        './src/webgl2.ts'
      ],
      formats: ['es']
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022'
    }
  },
  plugins: [
    glsl(),
    dts(),
    // TODO: find a way to remove type cast
    noBundlePlugin() as PluginOption
  ],
  worker: {
    format: 'es'
  }
}) satisfies UserConfig
