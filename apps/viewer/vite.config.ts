import { defineConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
// This is needed to serve the app over https
// if you are using an IP address instead of localhost to make sure
// crypto has SubtleCrypto which is needed in the @allmaps/id package

import ports from '../../ports.json'

export default defineConfig({
  server: {
    port: ports.viewer
  },
  plugins: [
    sveltekit(),
    // @ts-expect-error: Vite types are not up to date
    process.env.SSL && basicSsl()
  ]
})
