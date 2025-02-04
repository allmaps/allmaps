import { defineConfig, type UserConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.explore
  },
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['maplibre-gl', 'maplibre-contour']
  }
}) satisfies UserConfig
