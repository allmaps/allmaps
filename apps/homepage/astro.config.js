import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import svelte from '@astrojs/svelte'

import ports from '../../ports.json' with { type: 'json' }

const STATS_WEBSITE_ID = import.meta.env.VITE_STATS_WEBSITE_ID

const isDevelop = import.meta.env.DEV
const branch = isDevelop ? 'develop' : 'main'
const editLinkBaseUrl = `https://github.com/allmaps/allmaps/tree/${branch}/apps/homepage/`

export default defineConfig({
  server: { port: ports.homepage, host: true },
  devToolbar: {
    enabled: false
  },
  integrations: [
    starlight({
      title: 'Allmaps',
      defaultLocale: 'en',
      logo: {
        src: './src/images/allmaps-logo.svg'
      },
      head: STATS_WEBSITE_ID
        ? [
            {
              tag: 'script',
              attrs: {
                async: true,
                src: 'https://stats.allmaps.org/script.js',
                'data-website-id': STATS_WEBSITE_ID
              }
            }
          ]
        : undefined,
      favicon: '/favicon.png',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/allmaps/allmaps'
        }
      ],
      editLink: {
        baseUrl: editLinkBaseUrl
      },
      sidebar: [
        {
          label: 'Welcome to Allmaps',
          items: [
            {
              label: 'Introduction',
              link: '/introduction'
            },
            {
              label: 'Getting Started',
              link: '/getting-started'
            },
            {
              label: 'FAQ',
              link: '/faq'
            },
            {
              label: 'Timeline',
              link: '/timeline'
            }
          ]
        },
        {
          label: 'Guides',
          autogenerate: {
            directory: 'guides'
          }
        },
        {
          label: 'Docs',
          items: [
            {
              label: 'Introduction',
              link: '/docs/introduction'
            },
            {
              label: 'Packages',
              autogenerate: {
                directory: 'docs/packages'
              }
            }
          ]
        }
      ],
      components: {
        Header: './src/components/overrides/Header.astro',
        PageFrame: './src/components/overrides/PageFrame.astro',
        PageTitle: './src/components/overrides/PageTitle.astro',
        ThemeProvider: './src/components/overrides/ThemeProvider.astro'
      },
      customCss: [
        './src/css/layer-order.css',
        './src/css/overrides.css',
        './src/css/fonts.css',
        './src/css/starlight.css',
        './src/css/tailwind.css'
      ]
    }),
    svelte()
  ],

  vite: {
    ssr: {
      noExternal: ['maplibre-gl', 'maplibre-contour']
    },
    plugins: [tailwindcss()]
  }
})
