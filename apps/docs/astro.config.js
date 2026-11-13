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

const STATS_WEBSITE_ID = process.env.PUBLIC_STATS_WEBSITE_ID

const site = process.env.PUBLIC_DOCS_BASE_URL || 'https://docs.allmaps.org'
const isDevelop =
  site === 'https://dev.docs.allmaps.org' ||
  process.env.NODE_ENV === 'development'
const branch = isDevelop ? 'develop' : 'main'
const editLinkBaseUrl = `https://github.com/allmaps/allmaps/tree/${branch}/apps/docs/`

export default defineConfig({
  site,
  trailingSlash: 'never',
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
      description:
        'Guides, examples, and API reference for georeferencing historical maps and building with Allmaps.',
      routeMiddleware: './src/route-data.ts',
      markdown: {
        headingLinks: false
      },
      defaultLocale: 'en',
      logo: {
        src: './src/images/allmaps-logo.svg'
      },
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: 'https://fonts.allmaps.org/geograph/geograph-regular.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous'
          }
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: 'https://fonts.allmaps.org/geograph/geograph-bold.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous'
          }
        },
        ...(STATS_WEBSITE_ID
          ? [
              {
                tag: /** @type {const} */ ('script'),
                attrs: {
                  async: true,
                  src: 'https://stats.allmaps.org/script.js',
                  'data-website-id': STATS_WEBSITE_ID
                }
              }
            ]
          : [])
      ],
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
        Search: './src/components/StarlightSearch.astro',
        SocialIcons: './src/components/StarlightSocialLinks.astro',
        ThemeSelect: './src/components/StarlightThemeToggle.astro'
      },
      plugins: [
        scalarStarlight({
          pathname: '/apis/rest',
          label: 'REST API',
          title: 'Allmaps REST API',
          configuration: {
            agent: { disabled: true },
            sources: [
              {
                title: 'Allmaps REST API',
                url: new URL('/openapi.json', process.env.PUBLIC_REST_BASE_URL)
                  .href
              }
            ]
          }
        }),
        scalarStarlight({
          pathname: '/apis/annotations',
          label: 'Annotations API',
          title: 'Allmaps Annotations API',
          configuration: {
            agent: { disabled: true },
            sources: [
              {
                title: 'Allmaps Annotations API',
                url: new URL(
                  '/openapi.json',
                  process.env.PUBLIC_ANNOTATIONS_BASE_URL
                ).href
              }
            ]
          }
        }),
        {
          name: 'allmaps-api-sidebar',
          hooks: {
            'config:setup': ({ config, updateConfig }) => {
              // Scalar appends top-level links; these live under Reference → APIs.
              updateConfig({
                sidebar: config.sidebar?.filter(
                  (item) =>
                    typeof item !== 'object' ||
                    !('link' in item) ||
                    !['/apis/rest', '/apis/annotations'].includes(item.link)
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
              label: 'IDs in Allmaps',
              link: '/guides/ids-in-allmaps'
            },
            {
              label: 'Viewing maps',
              items: ['guides/allmaps-viewer', 'guides/plugins']
            },
            {
              label: 'Exporting and reusing maps',
              items: [
                'guides/xyz-map-tiles',
                'guides/export-geotiffs',
                'guides/export-images',
                'guides/export-geojson'
              ]
            },
            {
              label: 'Transforming coordinates',
              items: [
                'guides/transforming-coordinates',
                'guides/svg-to-geojson',
                'guides/transforming-ocr-annotations'
              ]
            }
          ]
        },
        {
          label: 'Reference',
          items: [
            {
              label: 'APIs',
              items: [
                {
                  label: 'Overview',
                  link: '/apis'
                },
                {
                  label: 'Annotations API',
                  link: '/apis/annotations'
                },
                {
                  label: 'REST API',
                  link: '/apis/rest'
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
