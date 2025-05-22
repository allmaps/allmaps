import { defineConfig, type UserConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'
import { qrcode } from 'vite-plugin-qrcode'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.here
  },
  plugins: [
    sveltekit(),
    qrcode(),
    // This is needed to serve the app over HTTPS
    process.env.SSL
      ? import('@vitejs/plugin-basic-ssl').then((module) => module.default())
      : undefined
  ]
}) satisfies UserConfig
