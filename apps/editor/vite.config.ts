import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.editor,
    fs: {
      strict: false,
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['maplibre-gl', 'maplibre-contour']
  },
  optimizeDeps: {
    include: ['sharedb-client-browser/dist/sharedb-client-umd.cjs']
  }
}) satisfies UserConfig
