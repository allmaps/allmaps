import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwind from '@astrojs/tailwind'
import svelte from '@astrojs/svelte'

import ports from '../../ports.json'

const STATS_WEBSITE_ID = import.meta.env.VITE_STATS_WEBSITE_ID

const isDevelop = import.meta.env.DEV
const branch = isDevelop ? 'develop' : 'main'
const editLinkBaseUrl = `https://github.com/allmaps/allmaps.github.io/tree/${branch}/`

// https://astro.build/config
export default defineConfig({
  server: { port: ports.docs, host: true },
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
        { label: 'Introduction', link: '/introduction/' },
        { label: 'Get Started', link: '/get-started/' },
        {
          label: 'Guides',
          // items: [{ label: 'Data', link: '/data/' }]
          autogenerate: {
            directory: 'guides'
          }
        },
        {
          label: 'Tutorials',
          items: [
            { label: 'For Historians', link: '/tutorials/for-historians/' },
            { label: 'For Students', link: '/tutorials/for-students/' },
            { label: 'For Developers', link: '/tutorials/for-developers/' },
            { label: 'For Curators', link: '/tutorials/for-curators/' }
          ]
        },
        {
          label: 'Reference',
          items: [
            {
              label: 'REST API',
              autogenerate: {
                directory: 'reference/api'
              }
            },
            {
              label: 'Packages',
              autogenerate: {
                directory: 'reference/packages'
              }
            },
            {
              label: 'Apps',
              autogenerate: {
                directory: 'reference/apps'
              }
            }
          ]
        }
        // { label: 'FAQ', link: '/faq/' },
        // { label: 'Glossary', link: '/glossary/' }
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
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  }
})
