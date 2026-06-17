// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import svelte from '@astrojs/svelte'

import ports from '../../ports.json' with { type: 'json' }

const STATS_WEBSITE_ID = import.meta.env.VITE_STATS_WEBSITE_ID

const isDevelop = import.meta.env.DEV
const branch = isDevelop ? 'develop' : 'main'
const editLinkBaseUrl = `https://github.com/allmaps/allmaps/tree/${branch}/apps/docs/`

export default defineConfig({
  site: 'https://docs.allmaps.org',
  server: { port: ports.docs, host: true },
  devToolbar: {
    enabled: false
  },
  integrations: [
    starlight({
      title: 'Allmaps Docs',
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
          label: 'Start Here',
          items: [
            {
              label: 'Introduction',
              link: '/introduction'
            },
            {
              label: 'International Image Interoperability Framework',
              link: '/iiif'
            },
            {
              label: 'Georeferencing',
              link: '/georeferencing'
            },
            {
              label: 'Getting Started',
              link: '/getting-started'
            },
            {
              label: 'Core Principles',
              link: '/core-principles'
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
          items: [{ autogenerate: { directory: 'guides' } }]
        },
        {
          label: 'Examples',
          items: [{ autogenerate: { directory: 'examples' } }]
        },
        {
          label: 'Reference',
          items: [
            {
              label: 'API',
              items: [{ autogenerate: { directory: 'api' } }]
            },
            {
              label: 'Packages',
              items: [{ autogenerate: { directory: 'packages' } }]
            }
          ]
        }
      ],
      customCss: [
        './src/css/tailwind.css',
        './src/css/fonts.css',
        './src/css/starlight.css'
      ]
    }),
    svelte()
  ],
  vite: {
    plugins: [tailwindcss()]
  }
})
