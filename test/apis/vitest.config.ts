import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@allmaps/api-rest': fileURLToPath(
        new URL('../../apis/rest/src/app.ts', import.meta.url)
      ),
      '@allmaps/api-annotations': fileURLToPath(
        new URL('../../apis/annotations/src/app.ts', import.meta.url)
      )
    }
  },
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false
  }
})
