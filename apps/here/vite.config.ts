import devtoolsJson from 'vite-plugin-devtools-json'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { qrcode } from 'vite-plugin-qrcode'

import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: {
    port: ports.here,
    fs: {
      strict: false,
      allow: [searchForWorkspaceRoot(process.cwd())]
    }
  },
  plugins: [
    devtoolsJson(),
    tailwindcss(),
    sveltekit(),
    qrcode(),
    // This is needed to serve the app over HTTPS
    process.env.SSL
      ? import('@vitejs/plugin-basic-ssl').then((module) => module.default())
      : undefined
  ]
}) satisfies UserConfig
