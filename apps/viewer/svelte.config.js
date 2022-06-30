import adapter from '@sveltejs/adapter-static'
import preprocess from 'svelte-preprocess'

import { defineConfig } from 'vite'
import ViteYaml from '@modyfi/vite-plugin-yaml'

const dev = process.env.NODE_ENV === 'development'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess(),

  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: null,
      precompress: false
    }),
    paths: {
      base: dev ? '' : '/webgl2-preview'
    },
    prerender: {
      default: true
    },
    vite: defineConfig({
      plugins: [ViteYaml()]
    })
  }
}

export default config
