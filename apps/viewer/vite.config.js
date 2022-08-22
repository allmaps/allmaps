import { sveltekit } from '@sveltejs/kit/vite'

import ViteYaml from '@modyfi/vite-plugin-yaml'

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit(), ViteYaml()]
}

export default config
