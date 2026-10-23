import cloudflare from '@sveltejs/adapter-cloudflare'
import node from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess({
    postcss: true
  }),
  kit: {
    adapter: process.env.ADAPTER === 'node' ? node() : cloudflare(),
    env: {
      dir: '../..'
    },
    alias: {
      $lib: './src/lib',
      '$lib/*': './src/lib/*'
    }
  }
}

export default config
