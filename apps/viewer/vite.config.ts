import { defineConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json'

export default defineConfig({
  server: {
    port: ports.viewer,
    proxy: {}
  },
  plugins: [
    sveltekit(),
    // This is needed to serve the app over https
    // if you are using an IP address instead of localhost to make sure
    // crypto has SubtleCrypto which is needed in the @allmaps/id package
    // @ts-expect-error: Vite types are not up to date
    process.env.SSL && import('@vitejs/plugin-basic-ssl').then((mod) => mod.default())
  ]
})
