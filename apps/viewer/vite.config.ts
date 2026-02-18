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
  plugins: [tailwindcss(), sveltekit(), devtoolsJson()]
}) satisfies UserConfig
