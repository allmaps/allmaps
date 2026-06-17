import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

function disableViteCors(): Plugin {
  return {
    name: 'disable-vite-cors',
    enforce: 'post',
    config() {
      return {
        server: {
          cors: false
        },
        preview: {
          cors: false
        }
      }
    }
  }
}

export default defineConfig({
  server: {
    cors: false
  },
  preview: {
    cors: false
  },
  plugins: [tailwindcss(), sveltekit(), disableViteCors()]
})
