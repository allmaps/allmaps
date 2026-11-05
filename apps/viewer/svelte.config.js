import cloudflare from '@sveltejs/adapter-cloudflare'
import node from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    experimental: {
      async: true
    }
  },
  kit: {
    adapter: process.env.ADAPTER === 'node' ? node() : cloudflare(),
    env: {
      dir: '../..'
    }
  }
}

export default config
