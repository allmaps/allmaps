import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import { sveltekit } from '@sveltejs/kit/vite'

// This is needed to serve the app over https
// if you are using an IP address instead of localhost to make sure
// crypto has SubtleCrypto which is needed in the @allmaps/id package
// import basicSsl from '@vitejs/plugin-basic-ssl'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.viewer,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [
    sveltekit()
    // @ts-ignore: Unreachable code error
    // basicSsl()
  ]
}) satisfies UserConfig
