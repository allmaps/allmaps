import { defineConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

import ports from '../../ports.json'

export default defineConfig({
  server: {
    port: ports.viewer
  },
  plugins: [sveltekit(), basicSsl()]
})
