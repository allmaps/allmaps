import cloudflare from '@sveltejs/adapter-cloudflare'
import node from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: process.env.ADAPTER === 'node' ? node() : cloudflare(),
    experimental: {
      remoteFunctions: true
    },
    env: {
      dir: '../..'
    }
  }
}

export default config
