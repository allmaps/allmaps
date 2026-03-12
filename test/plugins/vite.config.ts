import devtoolsJson from 'vite-plugin-devtools-json'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import ViteYaml from '@modyfi/vite-plugin-yaml'

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
  plugins: [tailwindcss(), sveltekit(), devtoolsJson(), ViteYaml()],
  ssr: {
    noExternal: ['maplibre-gl']
  }
}) satisfies UserConfig
