import adapter from '@sveltejs/adapter-cloudflare'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const environment = process.env.NODE_ENV === 'development' ? 'dev' : undefined

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess({
    postcss: true
  }),
  kit: {
    adapter: adapter({
      platformProxy: {
        environment
      }
    }),
    alias: {
      $lib: './src/lib',
      '$lib/*': './src/lib/*'
    }
  }
}

export default config
