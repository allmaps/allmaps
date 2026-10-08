import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  server: { port: ports.collage, strictPort: true },
  plugins: [tailwindcss(), sveltekit()],
  worker: { format: 'es' }
})
