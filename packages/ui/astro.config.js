// @ts-check
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'

import ports from '../../ports.json' with { type: 'json' }

export default defineConfig({
  site: 'https://ui.allmaps.org',
  trailingSlash: 'never',
  publicDir: './static',
  // Keep the website separate from the published Svelte library in dist/.
  outDir: './build',
  server: { port: ports.ui },
  devToolbar: { enabled: false },
  redirects: {
    '/buttons': '/components/button'
  },
  integrations: [
    starlight({
      title: 'Allmaps UI',
      description:
        'Shared Allmaps components, examples, and interactive controls.',
      logo: { src: '../../apps/docs/src/images/allmaps-logo.svg' },
      routeMiddleware: './src/component-navigation.ts',
      components: { Sidebar: './src/components/StyleguideSidebar.astro' },
      favicon: '/favicon.png',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/allmaps/allmaps'
        }
      ],
      sidebar: [
        { label: 'Introduction', link: '/' },
        {
          label: 'Components',
          items: [{ autogenerate: { directory: 'components' } }]
        }
      ],
      customCss: [
        './src/app.css',
        './src/lib/css/fonts.css',
        '../../apps/docs/src/css/starlight.css'
      ]
    }),
    svelte()
  ],
  vite: {
    // Keep the running playground's optimized modules isolated from Astro checks.
    cacheDir: fileURLToPath(
      new URL(
        process.argv.includes('dev')
          ? './node_modules/.vite-playground/'
          : './node_modules/.vite-sync/',
        import.meta.url
      )
    ),
    optimizeDeps: {
      entries: ['src/components/*Playground.svelte'],
      exclude: ['phosphor-svelte']
    },
    plugins: [tailwindcss()]
  }
})
