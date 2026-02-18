import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import devtoolsJson from 'vite-plugin-devtools-json'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.viewer,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },

  // This define and rollupOptions are
  // a last resort workaround to solve a Cloudflare deploy error.
  define: {
    'import.meta.url': JSON.stringify('http://localhost')
  },
  build: {
    rollupOptions: {
      external: ['node:module']
    }
  },

  plugins: [tailwindcss(), sveltekit(), devtoolsJson()]
}) satisfies UserConfig
