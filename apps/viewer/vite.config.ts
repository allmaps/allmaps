import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import devtoolsJson from 'vite-plugin-devtools-json'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: ports.viewer,
    fs: {
      strict: false,
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  ssr: {
    noExternal: ['maplibre-gl', 'maplibre-contour']
  },
  define: {
    __ALLMAPS_VIEWER_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  plugins: [tailwindcss(), sveltekit(), devtoolsJson()]
}) satisfies UserConfig
