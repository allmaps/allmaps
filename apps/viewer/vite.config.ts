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
  define: {
    'process.env.PUBLIC_PREVIEW_URL': JSON.stringify(
      process.env.PUBLIC_PREVIEW_URL ?? 'https://dev.preview.allmaps.org'
    )
  },
  plugins: [tailwindcss(), sveltekit(), devtoolsJson()]
}) satisfies UserConfig
