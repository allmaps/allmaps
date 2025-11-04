import devtoolsJson from 'vite-plugin-devtools-json'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'

import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.editor,
    fs: {
      strict: false,
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  define: {
    __ALLMAPS_EDITOR_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
  ssr: {
    noExternal: [
      'terra-draw',
      'terra-draw-maplibre-gl-adapter',
      'maplibre-gl',
      'maplibre-contour'
    ]
  },
  optimizeDeps: {
    include: ['sharedb-client-browser/dist/sharedb-client-umd.cjs']
  }
}) satisfies UserConfig
