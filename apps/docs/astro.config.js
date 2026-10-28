// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import svelte from '@astrojs/svelte'
import { scalarStarlight } from '@scalar/starlight'
import { satteri } from '@astrojs/markdown-satteri'

import ports from '../../ports.json' with { type: 'json' }
import headingLinks from './src/plugins/heading-links'
import { liveCodeTheme } from './src/plugins/live-code-theme.mjs'
import { mapExampleDependencies } from './src/plugins/map-example-dependencies.mjs'

const STATS_WEBSITE_ID = import.meta.env.VITE_STATS_WEBSITE_ID

const site = process.env.PUBLIC_DOCS_BASE_URL || 'https://docs.allmaps.org'
const isDevelop =
  site === 'https://dev.docs.allmaps.org' ||
  process.env.NODE_ENV === 'development'
const branch = isDevelop ? 'develop' : 'main'
const editLinkBaseUrl = `https://github.com/allmaps/allmaps/tree/${branch}/apps/docs/`

export default defineConfig({
  site,
  server: { port: ports.docs, host: true },
  devToolbar: {
    enabled: false
  },
  markdown: {
    processor: satteri({ hastPlugins: headingLinks })
  },
  integrations: [
    starlight({
      title: 'Allmaps Docs',
      markdown: {
        headingLinks: false
      },
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
      components: {
        Search: './src/components/StarlightSearch.astro'
      },
      plugins: [
        scalarStarlight({
          pathname: '/api/rest',
          label: 'REST API',
          title: 'Allmaps REST API',
          configuration: {
            agent: { disabled: true },
            sources: [
              {
                title: 'Allmaps REST API',
                // slug: 'allmaps-api',
                url: 'https://api.allmaps.org/openapi.json'
              }
            ]
          }
        }),
        scalarStarlight({
          pathname: '/api/annotations',
          label: 'Annotations API',
          title: 'Allmaps Annotations API',
          configuration: {
            agent: { disabled: true },
            sources: [
              {
                title: 'Allmaps Annotations API',
                // slug: 'allmaps-annotations-api',
                url: 'https://annotations.allmaps.org/openapi.json'
              }
            ]
          }
        }),
        {
          name: 'allmaps-api-sidebar',
          hooks: {
            'config:setup': ({ config, updateConfig }) => {
              // Scalar appends top-level links; these live under Reference → API.
              updateConfig({
                sidebar: config.sidebar?.filter(
                  (item) =>
                    typeof item !== 'object' ||
                    !('link' in item) ||
                    !['/api/rest', '/api/annotations'].includes(item.link)
                )
              })
            }
          }
        }
      ],
      sidebar: [
        {
          label: 'Getting started',
          items: [
            {
              label: 'Introduction',
              link: '/'
            },
            {
              label: 'IIIF',
              link: '/iiif'
            },
            {
              label: 'Georeference Annotations',
              link: '/georeference-annotations'
            }
          ]
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'Find maps to georeference',
              link: '/guides/find-maps-to-georeference'
            },
            {
              label: 'Georeferencing maps',
              link: '/guides/georeferencing-maps'
            },
            {
              label: 'Discover maps in Allmaps',
              link: '/guides/discover-maps'
            },
            {
              label: 'Viewing maps',
              link: '/guides/viewing-maps'
            },
            {
              label: 'Using maps in other tools',
              link: '/guides/using-maps'
            },
            {
              label: 'IDs in Allmaps',
              link: '/guides/ids-in-allmaps'
            }
          ]
        },
        {
          label: 'Reference',
          items: [
            {
              label: 'API',
              items: [
                {
                  label: 'Overview',
                  link: '/api'
                },
                {
                  label: 'Annotations API',
                  link: '/api/annotations'
                },
                {
                  label: 'REST API',
                  link: '/api/rest'
                }
              ]
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
        './src/css/starlight.css',
        './src/css/scalar.css'
      ]
    }),
    svelte(),
    mapExampleDependencies()
  ],
  vite: {
    worker: { format: 'es' },
    envDir: '../..',
    plugins: [tailwindcss(), liveCodeTheme(new URL('.', import.meta.url))]
  }
})
