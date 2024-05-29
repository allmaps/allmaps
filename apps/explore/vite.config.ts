import { defineConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json'

export default defineConfig({
  server: {
    port: ports.explore
  },
  plugins: [sveltekit()],
  ssr: {
    noExternal: 'maplibre-gl'
  }
})
