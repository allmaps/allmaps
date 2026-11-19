import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import noBundlePlugin from 'vite-plugin-no-bundle'
import dts from 'vite-plugin-dts'
import testdocs from 'testdocs/vite'

import ports from '../../ports.json' with { type: 'json' }

import type { PluginOption, UserConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    port: ports.maplibre
  },
  build: {
    target: 'es2022',
    sourcemap: true,
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
    testdocs(),
    dts(),
    // TODO: find a way to remove type cast
    noBundlePlugin() as PluginOption
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts']
        }
      },
      {
        extends: true,
        resolve: {
          alias: [{ find: /^vite-plus\/test$/, replacement: 'vitest' }]
        },
        server: {
          warmup: {
            clientFiles: ['./README.md']
          }
        },
        test: {
          name: 'readme',
          include: ['README.md'],
          setupFiles: ['./test/readme.setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      }
    ]
  }
}) satisfies UserConfig
