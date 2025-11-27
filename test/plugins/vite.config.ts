import devtoolsJson from 'vite-plugin-devtools-json'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'

import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.testPlugins,
    fs: {
      strict: false,
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
  ssr: {
    noExternal: ['maplibre-gl']
  }
}) satisfies UserConfig
