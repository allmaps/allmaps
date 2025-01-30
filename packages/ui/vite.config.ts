import { defineConfig, type UserConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.ui
  },
  plugins: [sveltekit()]
}) satisfies UserConfig
