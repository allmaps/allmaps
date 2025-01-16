import { defineConfig, searchForWorkspaceRoot } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.editor,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['sharedb-client-browser/dist/sharedb-client-umd.cjs']
  }
})
