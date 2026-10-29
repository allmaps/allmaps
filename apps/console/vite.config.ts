import devtoolsJson from 'vite-plugin-devtools-json'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { sveltePhosphorOptimize } from 'phosphor-svelte/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    sveltePhosphorOptimize(),
    devtoolsJson()
  ]
})
