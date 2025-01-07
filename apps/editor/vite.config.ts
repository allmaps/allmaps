import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.editor
  },
  plugins: [sveltekit()],
  ssr: {
    noExternal: []
  },
  optimizeDeps: {
    include: ['sharedb-client-browser/dist/sharedb-client-umd.cjs']
  }
})
