import devtoolsJson from 'vite-plugin-devtools-json'
import cloudflareQuickTunnel from 'vite-plugin-cloudflare-quick-tunnel'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { screenshots } from '@allmaps/screenshots/vite'

import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  envDir: '../..',
  server: {
    host: '0.0.0.0',
    port: ports.homepage,
    fs: {
      strict: false,
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [
    tailwindcss(),
    sveltekit(),
    screenshots(), // Collect during builds and preview local captures in dev.
    cloudflareQuickTunnel({ autoStart: false }),
    devtoolsJson()
  ],
  ssr: {
    noExternal: ['maplibre-gl', 'maplibre-contour']
  }
}) satisfies UserConfig
