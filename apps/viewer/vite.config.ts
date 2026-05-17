import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import devtoolsJson from 'vite-plugin-devtools-json'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.viewer,
    fs: {
      strict: false,
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  ssr: {
    noExternal: ['maplibre-gl', 'maplibre-contour']
  },
  plugins: [tailwindcss(), sveltekit(), devtoolsJson()]
}) satisfies UserConfig
