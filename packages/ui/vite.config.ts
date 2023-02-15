import { sveltekit } from '@sveltejs/kit/vite'
import type { UserConfig } from 'vite'

import ports from '../../ports.json'

const config: UserConfig = {
  server: {
    port: ports.ui
  },
  plugins: [sveltekit()]
}

export default config
