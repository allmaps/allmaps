// @ts-check
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'

import expressiveCode from './src/starlight/expressive-code.ts'
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
      expressiveCode,
      customCss: [
        './src/app.css',
        '../../apps/docs/src/css/fonts.css',
        '../../apps/docs/src/css/starlight.css'
      ],
      title: 'Allmaps UI',
      description:
        'Shared Allmaps components, examples, and interactive controls.',
      logo: { src: '../../apps/docs/src/images/allmaps-logo.svg' },
      routeMiddleware: './src/component-navigation.ts',
      components: {
        Sidebar: './src/starlight/components/StyleguideSidebar.astro'
      },
      head: ['regular', 'bold'].map((weight) => ({
        tag: 'link',
        attrs: {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          crossorigin: 'anonymous',
          href: `https://fonts.allmaps.org/geograph/geograph-${weight}.woff2`
        }
      })),
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
      ]
    }),
    svelte()
  ],
  vite: {
    envDir: fileURLToPath(new URL('../..', import.meta.url)),
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
      entries: ['src/starlight/components/*Playground.svelte'],
      exclude: ['phosphor-svelte']
    },
    plugins: [tailwindcss()]
  }
})
