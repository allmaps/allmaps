import { defineConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json'

export default defineConfig({
  server: {
    port: ports.info
  },
  plugins: [sveltekit()]
})
