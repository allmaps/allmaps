import { sveltekit } from '@sveltejs/kit/vite'

import ports from '../../ports.json'

/** @type {import('vite').UserConfig} */
const config = {
  server: {
    port: ports.explore
  },
  plugins: [sveltekit()]
}

export default config
