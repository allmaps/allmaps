import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwind from '@astrojs/tailwind'
import svelte from '@astrojs/svelte'

import ports from '../../ports.json' with { type: 'json' }

const STATS_WEBSITE_ID = import.meta.env.VITE_STATS_WEBSITE_ID

const isDevelop = import.meta.env.DEV
const branch = isDevelop ? 'develop' : 'main'
const editLinkBaseUrl = `https://github.com/allmaps/allmaps/tree/${branch}/apps/hompage`

export default defineConfig({
  server: { port: ports.homepage, host: true },
  devToolbar: {
    enabled: false
  },
  integrations: [
    starlight({
      title: 'Allmaps',
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
      social: {
        github: 'https://github.com/allmaps/allmaps'
      },
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
        './src/css/overrides.css',
        './src/css/tailwind.css',
        './src/css/fonts.css',
        './src/css/starlight.css'
      ]
    }),
    svelte(),
    tailwind({ applyBaseStyles: false })
  ],
  // Process images with sharp: https://docs.astro.build/en/guides/assets/#using-sharp
  vite: {
    ssr: {
      noExternal: ['maplibre-gl', 'maplibre-contour']
    }
  }
})
